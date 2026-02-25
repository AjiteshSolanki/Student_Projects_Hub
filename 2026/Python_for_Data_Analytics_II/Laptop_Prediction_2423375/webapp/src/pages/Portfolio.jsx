import { useEffect, useState } from 'react';
import { fetchOptions, fetchPortfolio } from '../api';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function Portfolio() {
  const [opts, setOpts] = useState(null);
  const [filters, setFilters] = useState({ company: 'All', type: 'All', os: 'All' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchOptions().then(setOpts); }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.company !== 'All') params.company = filters.company;
    if (filters.type !== 'All') params.type = filters.type;
    if (filters.os !== 'All') params.os = filters.os;
    fetchPortfolio(params).then((d) => { setData(d); setLoading(false); });
  }, [filters]);

  const set = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">Portfolio Analysis</h1>
        <p className="page-subtitle">
          Explore segment pricing spreads and identify under-priced opportunities in your catalog.
        </p>
      </div>

      {/* Filters */}
      {opts && (
        <div className="glass-card" style={{ marginBottom: 24 }}>
          <div className="card-title">Segment Filters</div>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Company</label>
              <select className="form-select" value={filters.company} onChange={set('company')}>
                <option>All</option>
                {opts.companies.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Laptop Type</label>
              <select className="form-select" value={filters.type} onChange={set('type')}>
                <option>All</option>
                {opts.types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operating System</label>
              <select className="form-select" value={filters.os} onChange={set('os')}>
                <option>All</option>
                {opts.os_list.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="callout">Loading portfolio data…</div>}

      {data && !loading && (
        <>
          {/* Segment spread */}
          <div className="glass-card" style={{ marginBottom: 24 }}>
            <div className="card-title">Segment Pricing Spread</div>
            {(data.spread || []).length === 0 ? (
              <p style={{ color: '#8999b4' }}>No data matches the selected filters.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Type</th>
                      <th>Avg Actual</th>
                      <th>Avg Predicted</th>
                      <th>Avg Gap</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.spread.map((r, i) => (
                      <tr key={i}>
                        <td>{r.Company}</td>
                        <td>{r.TypeName}</td>
                        <td>{fmt(r.avg_actual)}</td>
                        <td>{fmt(r.avg_predicted)}</td>
                        <td style={{ color: r.avg_gap >= 0 ? '#34d399' : '#f87171' }}>{fmt(r.avg_gap)}</td>
                        <td>{r.sku_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Under-priced opportunities */}
          <div className="glass-card">
            <div className="card-title">
              Top Under-priced Opportunities
              <span style={{ fontWeight: 400, fontSize: 13, color: '#8999b4', marginLeft: 8 }}>
                (Actual &lt; Predicted — room to re-price)
              </span>
            </div>
            {(data.opportunities || []).length === 0 ? (
              <p style={{ color: '#8999b4' }}>No underpriced units in this segment.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Type</th>
                      <th>CPU</th>
                      <th>RAM</th>
                      <th>Actual Price</th>
                      <th>Predicted Price</th>
                      <th>Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.opportunities.map((r, i) => (
                      <tr key={i}>
                        <td>{r.Company}</td>
                        <td>{r.TypeName}</td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.Cpu}</td>
                        <td>{r.Ram} GB</td>
                        <td>{fmt(r.Price)}</td>
                        <td>{fmt(r.PredictedPrice)}</td>
                        <td style={{ color: '#34d399', fontWeight: 600 }}>+{fmt(r.PricingGap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
