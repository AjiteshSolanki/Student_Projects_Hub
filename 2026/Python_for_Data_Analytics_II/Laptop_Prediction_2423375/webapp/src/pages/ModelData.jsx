import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { fetchModelInfo } from '../api';
import { MetricCard, Skeleton } from '../components/MetricCard';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function ModelData() {
  const [info, setInfo] = useState(null);

  useEffect(() => { fetchModelInfo().then(setInfo); }, []);

  if (!info) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">Model & Data</h1></div>
        <Skeleton count={4} />
      </div>
    );
  }

  const coeffs = (info.top_features || []).map((c) => ({
    ...c,
    absVal: Math.abs(c.coefficient),
    positive: c.coefficient >= 0,
  }));

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">Model & Data</h1>
        <p className="page-subtitle">
          Inspect regression quality metrics, data coverage, and the features driving price predictions.
        </p>
      </div>

      {/* Quality metrics */}
      <div className="metrics-row">
        <MetricCard label="R² Score" value={info.metrics.r2.toFixed(4)} />
        <MetricCard label="RMSE" value={fmt(info.metrics.rmse)} />
        <MetricCard label="MAE" value={fmt(info.metrics.mae)} />
        <MetricCard label="Training Rows" value={(info.coverage.rows || 0).toLocaleString()} />
      </div>

      {/* Feature coverage */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-title">Data Coverage</div>
        <div className="grid-3">
          <div className="form-group">
            <span className="form-label">Companies</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{info.coverage.companies}</span>
          </div>
          <div className="form-group">
            <span className="form-label">Laptop Types</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{info.coverage.types}</span>
          </div>
          <div className="form-group">
            <span className="form-label">GPUs</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{info.coverage.gpus}</span>
          </div>
        </div>
      </div>

      {/* Top coefficients chart */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-title">Top 15 Feature Coefficients</div>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={coeffs} layout="vertical" margin={{ left: 160, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: '#a3b1cc' }} width={150} />
            <Tooltip
              formatter={(v) => fmt(v)}
              contentStyle={{ background: '#141a24', border: '1px solid rgba(130,160,255,.2)', borderRadius: 10 }}
            />
            <Bar dataKey="coefficient" radius={[0, 6, 6, 0]}>
              {coeffs.map((c, i) => (
                <Cell key={i} fill={c.positive ? '#638cff' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Coefficients table */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-title">Coefficient Details</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Feature</th>
                <th>Coefficient (₹)</th>
                <th>Direction</th>
              </tr>
            </thead>
            <tbody>
              {coeffs.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{c.feature}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(c.coefficient)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: c.positive ? 'rgba(99,140,255,.15)' : 'rgba(248,113,113,.15)',
                      color: c.positive ? '#638cff' : '#f87171',
                    }}>
                      {c.positive ? '▲ Positive' : '▼ Negative'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limitations callout */}
      <div className="callout">
        <strong>⚠ Prediction Limitations:</strong> This linear regression model explains ~81.5 % of price variance.
        Predictions may be less accurate for configurations under-represented in the training data (e.g., niche brands,
        unusual RAM / GPU combinations). Always cross-reference with recent market pricing when quoting high-value deals.
      </div>
    </div>
  );
}
