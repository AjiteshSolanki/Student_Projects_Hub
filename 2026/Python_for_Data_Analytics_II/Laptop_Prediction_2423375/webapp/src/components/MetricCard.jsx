export function MetricCard({ label, value, delta, deltaType }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {delta !== undefined && (
        <div className={`metric-delta ${deltaType || ''}`}>{delta}</div>
      )}
    </div>
  );
}

export function Skeleton({ count = 4 }) {
  return (
    <div className="metrics-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}
