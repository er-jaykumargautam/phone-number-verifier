const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  sendOtp: (phone) => request('/api/send-otp', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, code) => request('/api/verify-otp', { method: 'POST', body: { phone, code } }),
  me: (token) => request('/api/me', { token }),
};
