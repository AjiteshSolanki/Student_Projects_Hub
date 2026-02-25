import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
from scipy.stats import pearsonr, spearmanr
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

# Load Data
df = pd.read_csv("Advertising.csv")

# ---------------------------
# Data Cleaning
# ---------------------------
print("Missing Values:\n", df.isnull().sum())

# Feature Engineering
df["total_ad_spend"] = df["TV"] + df["radio"] + df["newspaper"]
df["tv_radio_interaction"] = df["TV"] * df["radio"]

# ---------------------------
# Descriptive Statistics
# ---------------------------
print("\nDescriptive Statistics:")
print(df.describe())

print("\nMedian:\n", df.median())
print("\nVariance:\n", df.var())

# ---------------------------
# Correlation Analysis
# ---------------------------
print("\nPearson Correlation Matrix:")
print(df.corr())

corr, p_value = spearmanr(df["radio"], df["sales"])
print("\nSpearman Correlation (radio vs sales):")
print("Correlation:", corr)
print("P-value:", p_value)

# ---------------------------
# Visualization
# ---------------------------
sns.heatmap(df.corr(), annot=True, cmap="coolwarm")
plt.title("Correlation Heatmap")
plt.show()

sns.scatterplot(x="TV", y="sales", data=df)
plt.title("TV vs Sales")
plt.show()

sns.scatterplot(x="radio", y="sales", data=df)
plt.title("Radio vs Sales")
plt.show()

# ---------------------------
# Multiple Linear Regression
# ---------------------------
X = df[["TV", "radio", "newspaper"]]
y = df["sales"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print("\nR-squared:", r2_score(y_test, y_pred))

print("\nRegression Coefficients:")
for feature, coef in zip(X.columns, model.coef_):
    print(feature, ":", coef)

print("Intercept:", model.intercept_)

# ---------------------------
# Adjusted R-Squared
# ---------------------------
X_sm = sm.add_constant(X)
model_sm = sm.OLS(y, X_sm).fit()
print("\nAdjusted R-Squared:", model_sm.rsquared_adj)

# ---------------------------
# Multicollinearity (VIF)
# ---------------------------
vif_data = pd.DataFrame()
vif_data["Feature"] = X.columns
vif_data["VIF"] = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
print("\nVIF Values:\n", vif_data)