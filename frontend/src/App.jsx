import { useState } from 'react';

import { api } from './api.js';

export default function App() {
  const [phone, setPhone] = useState('+14155552671');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(label, fn) {
    setError(null);
    setBusy(true);
    try {
      const result = await fn();
      setOutput({ label, data: result });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <h1>Phone Number Verifier</h1>
      <p className="subtitle">
        Enter a phone, send an OTP, verify it, get a JWT, and call a protected route.
      </p>

      <div className="section">
        <h2>1. Send OTP</h2>
        <div className="row">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+14155552671"
          />
          <button
            disabled={busy || !phone}
            onClick={() => run('send-otp', () => api.sendOtp(phone))}
          >
            Send code
          </button>
        </div>
        <p className="muted">E.164 format. With SMS_TRANSPORT=console, the code prints in the backend terminal.</p>
      </div>

      <div className="section">
        <h2>2. Verify OTP</h2>
        <div className="row">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
          />
          <button
            disabled={busy || code.length !== 6}
            onClick={() =>
              run('verify-otp', async () => {
                const data = await api.verifyOtp(phone, code);
                setToken(data.token);
                setCode('');
                return data;
              })
            }
          >
            Verify
          </button>
        </div>
      </div>

      {/* <div className="section">
        <h2>3. Call protected route</h2>
        <button
          disabled={busy || !token}
          onClick={() => run('me', () => api.me(token))}
        >
          GET /api/me
        </button>
        {token && (
          <p className="muted">
            <strong>JWT:</strong> {token.slice(0, 32)}…
          </p>
        )}
      </div> */}

      {error && <div className="error">{error}</div>}

      {output && (
        <div className="section">
          <h2>{output.label} — response</h2>
          <pre>{JSON.stringify(output.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
