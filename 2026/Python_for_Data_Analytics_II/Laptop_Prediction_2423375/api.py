"""
FastAPI backend for PriceIQ – B2B Laptop Pricing Intelligence.
Run with:  uvicorn api:app --reload --port 8000
"""

import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

app = FastAPI(title="PriceIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global state – lazy-loaded once
# ---------------------------------------------------------------------------
_data: pd.DataFrame | None = None
_model: Pipeline | None = None
_metrics: dict | None = None
_data_scored: pd.DataFrame | None = None


def _load() -> None:
    global _data, _model, _metrics, _data_scored
    if _data is not None:
        return

    project_root = Path(__file__).resolve().parent
    data_path = project_root / "data" / "processed" / "cleaned_laptop_data.csv"
    data = pd.read_csv(data_path).copy()
    data["Ram"] = data["Ram"].astype(str).str.replace("GB", "", regex=False).astype(float)
    data["Weight"] = data["Weight"].astype(str).str.replace("kg", "", regex=False).astype(float)

    X = data.drop(columns=["Price"])
    y = data["Price"]

    cat_cols = X.select_dtypes(include=["object"]).columns.tolist()
    num_cols = X.select_dtypes(exclude=["object"]).columns.tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ]
    )

    model = Pipeline([("preprocessor", preprocessor), ("regressor", LinearRegression())])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    metrics = {
        "mae": round(float(mean_absolute_error(y_test, y_pred)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 2),
        "r2": round(float(r2_score(y_test, y_pred)), 4),
        "residual_std": round(float(np.std(y_test - y_pred)), 2),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
    }

    scored = data.copy()
    scored["PredictedPrice"] = model.predict(X).round(2)
    scored["PricingGap"] = (scored["Price"] - scored["PredictedPrice"]).round(2)

    _data = data
    _model = model
    _metrics = metrics
    _data_scored = scored


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/stats")
def get_stats():
    _load()
    d = _data_scored

    bins = pd.cut(d["Price"], bins=8)
    dist = d.groupby(bins, observed=False).size().reset_index(name="count")
    dist["range"] = dist["Price"].astype(str)

    company_med = (
        d.groupby("Company")["Price"]
        .median()
        .sort_values(ascending=False)
        .head(10)
        .reset_index()
        .rename(columns={"Price": "median_price"})
    )

    overpriced = int((d["PricingGap"] > 0).sum())
    underpriced = int((d["PricingGap"] < 0).sum())

    type_med = (
        d.groupby("TypeName")["Price"]
        .median()
        .sort_values(ascending=False)
        .reset_index()
        .rename(columns={"Price": "median_price"})
    )

    return {
        "total_skus": len(d),
        "avg_price": round(float(d["Price"].mean()), 2),
        "median_price": round(float(d["Price"].median()), 2),
        "min_price": round(float(d["Price"].min()), 2),
        "max_price": round(float(d["Price"].max()), 2),
        "model_r2": _metrics["r2"],
        "model_rmse": _metrics["rmse"],
        "overpriced": overpriced,
        "underpriced": underpriced,
        "price_distribution": dist[["range", "count"]].to_dict(orient="records"),
        "company_medians": company_med.to_dict(orient="records"),
        "type_medians": type_med.to_dict(orient="records"),
    }


@app.get("/api/options")
def get_options():
    _load()
    d = _data
    return {
        "companies": sorted(d["Company"].unique().tolist()),
        "types": sorted(d["TypeName"].unique().tolist()),
        "cpus": sorted(d["Cpu"].unique().tolist()),
        "gpus": sorted(d["Gpu"].unique().tolist()),
        "memories": sorted(d["Memory"].unique().tolist()),
        "os_list": sorted(d["OpSys"].unique().tolist()),
        "resolutions": sorted(d["ScreenResolution"].unique().tolist()),
        "ram_range": [int(d["Ram"].min()), int(d["Ram"].max())],
        "ram_values": sorted(d["Ram"].unique().tolist()),
        "inches_range": [round(float(d["Inches"].min()), 1), round(float(d["Inches"].max()), 1)],
        "weight_range": [round(float(d["Weight"].min()), 2), round(float(d["Weight"].max()), 2)],
    }


class PredictRequest(BaseModel):
    Company: str
    TypeName: str
    Inches: float
    ScreenResolution: str
    Cpu: str
    Ram: float
    Memory: str
    Gpu: str
    OpSys: str
    Weight: float
    strategy: str = "Market Balanced"


@app.post("/api/predict")
def predict(req: PredictRequest):
    _load()
    row = pd.DataFrame(
        [
            {
                "Company": req.Company,
                "TypeName": req.TypeName,
                "Inches": req.Inches,
                "ScreenResolution": req.ScreenResolution,
                "Cpu": req.Cpu,
                "Ram": req.Ram,
                "Memory": req.Memory,
                "Gpu": req.Gpu,
                "OpSys": req.OpSys,
                "Weight": req.Weight,
            }
        ]
    )

    predicted = float(_model.predict(row)[0])

    buffers = {"Conservative": 0.08, "Market Balanced": 0.12, "Aggressive": 0.16}
    frac = buffers.get(req.strategy, 0.12)
    confidence = min(_metrics["residual_std"], predicted * frac)

    peers = _data.loc[
        (_data["Company"] == req.Company) & (_data["TypeName"] == req.TypeName),
        "Price",
    ]
    peer_avg = float(peers.mean()) if not peers.empty else float(_data["Price"].mean())
    percentile = float((_data["Price"] <= predicted).mean() * 100)

    return {
        "predicted_price": round(predicted, 2),
        "floor": round(predicted - confidence, 2),
        "ceiling": round(predicted + confidence, 2),
        "peer_avg": round(peer_avg, 2),
        "market_percentile": round(percentile, 1),
        "delta_vs_peer": round(predicted - peer_avg, 2),
    }


@app.get("/api/sensitivity")
def sensitivity(feature: str = "Ram"):
    _load()
    d = _data
    base = {
        "Company": d["Company"].mode().iloc[0],
        "TypeName": d["TypeName"].mode().iloc[0],
        "Inches": float(d["Inches"].median()),
        "ScreenResolution": d["ScreenResolution"].mode().iloc[0],
        "Cpu": d["Cpu"].mode().iloc[0],
        "Ram": float(d["Ram"].median()),
        "Memory": d["Memory"].mode().iloc[0],
        "Gpu": d["Gpu"].mode().iloc[0],
        "OpSys": d["OpSys"].mode().iloc[0],
        "Weight": float(d["Weight"].median()),
    }

    if feature == "Ram":
        values = sorted(d["Ram"].unique().tolist())
    elif feature == "Weight":
        lo = float(d["Weight"].quantile(0.1))
        hi = float(d["Weight"].quantile(0.9))
        values = np.round(np.linspace(lo, hi, 12), 2).tolist()
    elif feature == "Inches":
        values = sorted(d["Inches"].unique().tolist())
    else:
        return {"error": "Unsupported feature"}

    results = []
    for v in values:
        row = base.copy()
        row[feature] = v
        pred = float(_model.predict(pd.DataFrame([row]))[0])
        results.append({"value": v, "predicted_price": round(pred, 2)})

    return {"feature": feature, "data": results}


@app.get("/api/portfolio")
def portfolio(company: str = "All", type_name: str = "All", os_name: str = "All"):
    _load()
    d = _data_scored.copy()
    if company != "All":
        d = d[d["Company"] == company]
    if type_name != "All":
        d = d[d["TypeName"] == type_name]
    if os_name != "All":
        d = d[d["OpSys"] == os_name]

    spread = (
        d.groupby(["Company", "TypeName"], as_index=False)
        .agg(
            avg_actual=("Price", "mean"),
            avg_predicted=("PredictedPrice", "mean"),
            avg_gap=("PricingGap", "mean"),
            sku_count=("Price", "size"),
        )
        .sort_values("avg_gap")
        .round(2)
    )

    opportunities = (
        d.sort_values("PricingGap")
        .loc[
            :,
            ["Company", "TypeName", "Cpu", "Ram", "Memory", "Price", "PredictedPrice", "PricingGap"],
        ]
        .head(20)
        .round(2)
    )

    return {
        "spread": spread.to_dict(orient="records"),
        "opportunities": opportunities.to_dict(orient="records"),
        "total_filtered": len(d),
    }


@app.get("/api/model-info")
def model_info():
    _load()
    d = _data

    regressor = _model.named_steps["regressor"]
    preprocessor = _model.named_steps["preprocessor"]
    feature_names = preprocessor.get_feature_names_out().tolist()

    coefs = regressor.coef_.tolist()
    coef_list = sorted(
        [{"feature": f, "coefficient": round(c, 2)} for f, c in zip(feature_names, coefs)],
        key=lambda x: abs(x["coefficient"]),
        reverse=True,
    )[:15]

    return {
        "metrics": _metrics,
        "coverage": {
            "rows": len(d),
            "companies": int(d["Company"].nunique()),
            "types": int(d["TypeName"].nunique()),
            "cpus": int(d["Cpu"].nunique()),
            "gpus": int(d["Gpu"].nunique()),
            "memories": int(d["Memory"].nunique()),
        },
        "top_features": coef_list,
    }
