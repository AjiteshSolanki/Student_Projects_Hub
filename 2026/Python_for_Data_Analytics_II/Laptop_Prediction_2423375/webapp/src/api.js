const BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${BASE}/stats`);
  return res.json();
}

export async function fetchOptions() {
  const res = await fetch(`${BASE}/options`);
  return res.json();
}

export async function fetchPredict(body) {
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchSensitivity(feature = 'Ram') {
  const res = await fetch(`${BASE}/sensitivity?feature=${feature}`);
  return res.json();
}

export async function fetchPortfolio({ company = 'All', type = 'All', os = 'All' } = {}) {
  const params = new URLSearchParams({ company, type_name: type, os_name: os });
  const res = await fetch(`${BASE}/portfolio?${params}`);
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${BASE}/model-info`);
  return res.json();
}
