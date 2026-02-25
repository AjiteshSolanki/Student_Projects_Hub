import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchOptions, fetchPredict, fetchSensitivity } from '../api';
import { MetricCard, Skeleton } from '../components/MetricCard';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STRATEGIES = ['Conservative', 'Market Balanced', 'Aggressive'];

export default function QuoteSimulator() {
  const [opts, setOpts] = useState(null);
  const [form, setForm] = useState({});
  const [strategy, setStrategy] = useState('Market Balanced');
  const [result, setResult] = useState(null);
  const [ramSens, setRamSens] = useState([]);
  const [weightSens, setWeightSens] = useState([]);

  useEffect(() => {
    fetchOptions().then((o) => {
      setOpts(o);
      setForm({
        Company: o.companies[0],
        TypeName: o.types[0],
        Cpu: o.cpus[0],
        Gpu: o.gpus[0],
        Memory: o.memories[0],
        OpSys: o.os_list[0],
        ScreenResolution: o.resolutions[0],
        Ram: o.ram_values[Math.floor(o.ram_values.length / 2)],
        Inches: parseFloat(((o.inches_range[0] + o.inches_range[1]) / 2).toFixed(1)),
        Weight: parseFloat(((o.weight_range[0] + o.weight_range[1]) / 2).toFixed(2)),
      });
    });
    fetchSensitivity('Ram').then((d) => setRamSens(d.data || []));
    fetchSensitivity('Weight').then((d) => setWeightSens(d.data || []));
  }, []);

  const predict = useCallback(() => {
    if (!form.Company) return;
    fetchPredict({ ...form, strategy }).then(setResult);
  }, [form, strategy]);

  useEffect(() => {
    predict();
  }, [predict]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }));

  if (!opts) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1 className="page-title">Quote Simulator</h1></div>
        <Skeleton count={4} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">Quote Simulator</h1>
        <p className="page-subtitle">
          Configure a laptop, choose a pricing strategy, and get an instant quote recommendation with peer benchmarks.
        </p>
      </div>

      {/* Strategy toggle */}
      <div className="strategy-group">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            className={`strategy-btn${strategy === s ? ' active' : ''}`}
            onClick={() => setStrategy(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Config form */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-title">Laptop Configuration</div>
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Company</label>
            <select className="form-select" value={form.Company} onChange={set('Company')}>
              {opts.companies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Laptop Type</label>
            <select className="form-select" value={form.TypeName} onChange={set('TypeName')}>
              {opts.types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Operating System</label>
            <select className="form-select" value={form.OpSys} onChange={set('OpSys')}>
              {opts.os_list.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">CPU</label>
            <select className="form-select" value={form.Cpu} onChange={set('Cpu')}>
              {opts.cpus.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">GPU</label>
            <select className="form-select" value={form.Gpu} onChange={set('Gpu')}>
              {opts.gpus.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Memory</label>
            <select className="form-select" value={form.Memory} onChange={set('Memory')}>
              {opts.memories.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Screen Resolution</label>
            <select className="form-select" value={form.ScreenResolution} onChange={set('ScreenResolution')}>
              {opts.resolutions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">RAM — {form.Ram} GB</label>
            <input type="range" min={opts.ram_range[0]} max={opts.ram_range[1]} step={1} value={form.Ram} onChange={setNum('Ram')} />
          </div>
          <div className="form-group">
            <label className="form-label">Screen — {form.Inches}"</label>
            <input type="range" min={opts.inches_range[0]} max={opts.inches_range[1]} step={0.1} value={form.Inches} onChange={setNum('Inches')} />
          </div>
          <div className="form-group">
            <label className="form-label">Weight — {form.Weight} kg</label>
            <input type="range" min={opts.weight_range[0]} max={opts.weight_range[1]} step={0.01} value={form.Weight} onChange={setNum('Weight')} />
          </div>
        </div>
      </div>

      {/* Quote results */}
      {result && (
        <>
          <div className="metrics-row">
            <MetricCard label="Recommended Quote" value={fmt(result.predicted_price)} />
            <MetricCard label="Negotiation Floor" value={fmt(result.floor)} />
            <MetricCard label="Negotiation Ceiling" value={fmt(result.ceiling)} />
            <MetricCard label="Market Percentile" value={`${result.market_percentile}%`} />
          </div>

          <div className="callout">
            <strong>Peer segment average:</strong> {fmt(result.peer_avg)}
            &nbsp;·&nbsp;
            <strong>Delta:</strong>{' '}
            <span style={{ color: result.delta_vs_peer >= 0 ? '#34d399' : '#f87171' }}>
              {result.delta_vs_peer >= 0 ? '+' : ''}{fmt(result.delta_vs_peer)}
            </span>
          </div>
        </>
      )}

      {/* Sensitivity charts */}
      <div className="grid-2">
        <div className="glass-card">
          <div className="card-title">What-if: RAM Sensitivity</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ramSens}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="value" label={{ value: 'RAM (GB)', position: 'insideBottom', offset: -4, fill: '#8999b4', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#141a24', border: '1px solid rgba(130,160,255,.2)', borderRadius: 10 }} />
              <Line type="monotone" dataKey="predicted_price" stroke="#638cff" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card">
          <div className="card-title">What-if: Weight Sensitivity</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weightSens}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="value" label={{ value: 'Weight (kg)', position: 'insideBottom', offset: -4, fill: '#8999b4', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#141a24', border: '1px solid rgba(130,160,255,.2)', borderRadius: 10 }} />
              <Line type="monotone" dataKey="predicted_price" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
