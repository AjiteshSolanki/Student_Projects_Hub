import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchStats } from '../api';
import { MetricCard, Skeleton } from '../components/MetricCard';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">Overview</h1>
        </div>
        <Skeleton count={4} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">B2B Laptop Pricing Intelligence</h1>
        <p className="page-subtitle">
          Executive snapshot — market distribution, model confidence, and pricing health at a glance.
        </p>
      </div>

      {/* KPI strip */}
      <div className="metrics-row">
        <MetricCard label="Catalog SKUs" value={stats.total_skus.toLocaleString()} />
        <MetricCard label="Average Price" value={fmt(stats.avg_price)} />
        <MetricCard label="Model R²" value={stats.model_r2.toFixed(3)} />
        <MetricCard label="Model RMSE" value={fmt(stats.model_rmse)} />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Price distribution */}
        <div className="glass-card">
          <div className="card-title">Market Price Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.price_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: '#141a24', border: '1px solid rgba(130,160,255,.2)', borderRadius: 10 }}
                labelStyle={{ color: '#8999b4' }}
              />
              <Bar dataKey="count" fill="#638cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Company medians */}
        <div className="glass-card">
          <div className="card-title">Top Companies by Median Price</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.company_medians} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="Company" width={80} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => fmt(v)}
                contentStyle={{ background: '#141a24', border: '1px solid rgba(130,160,255,.2)', borderRadius: 10 }}
              />
              <Bar dataKey="median_price" fill="#34d399" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pricing health */}
      <div className="grid-3">
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div className="metric-label">Overpriced vs Model</div>
          <div className="metric-value" style={{ color: '#f87171' }}>{stats.overpriced} SKUs</div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div className="metric-label">Underpriced Opportunity</div>
          <div className="metric-value" style={{ color: '#34d399' }}>{stats.underpriced} SKUs</div>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div className="metric-label">Price Band</div>
          <div className="metric-value">{fmt(stats.min_price)} — {fmt(stats.max_price)}</div>
        </div>
      </div>

      <div className="callout" style={{ marginTop: 24 }}>
        <strong>Business insight:</strong> High underpriced volume suggests immediate quote uplift potential. High overpriced volume signals discount risk and slower conversion. Use the Quote Simulator to test individual configurations.
      </div>
    </div>
  );
}
