import { useState } from 'react';
import { loginOrRegister } from '../store/gameStore';

const field = {
  width: '100%',
  background: '#0e1118',
  border: '1px solid #2a2e3a',
  borderRadius: 6,
  color: '#eee',
  padding: '10px 12px',
  fontSize: 14,
  marginBottom: 12,
  boxSizing: 'border-box' as const,
};

export function LoginScreen({ onClose }: { onClose?: () => void } = {}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !password) {
      setError('Enter a name and password');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await loginOrRegister(mode, name.trim(), password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? 'Failed');
    else onClose?.();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 13, 0.9)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ddd',
      }}
    >
      <div style={{ width: 380, maxWidth: '92vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <h1 style={{ color: '#fff', letterSpacing: 4, fontSize: 28, margin: 0 }}>WORLD CONFLICT</h1>
          <div style={{ color: '#8a96a8', fontSize: 13, marginTop: 6 }}>
            Optional: an account keeps your saves across devices. You can always play as a guest.
          </div>
        </div>

        <div style={{ background: '#12151d', border: '1px solid #2a2e3a', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
            <button
              onClick={() => { setMode('login'); setError(null); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                background: mode === 'login' ? '#2a6dd9' : '#1a1e28',
                color: mode === 'login' ? '#fff' : '#889', fontWeight: 600,
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                background: mode === 'register' ? '#2a6dd9' : '#1a1e28',
                color: mode === 'register' ? '#fff' : '#889', fontWeight: 600,
              }}
            >
              Create account
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#778', marginBottom: 4 }}>Player name</div>
          <input
            style={field}
            value={name}
            maxLength={32}
            placeholder="e.g. Alexandra"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <div style={{ fontSize: 11, color: '#778', marginBottom: 4 }}>Password</div>
          <input
            style={field}
            type="password"
            value={password}
            placeholder={mode === 'register' ? 'Choose a password' : 'Your password'}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          {error && <div style={{ color: '#ff8080', fontSize: 13, marginBottom: 10 }}>✕ {error}</div>}

          <button
            onClick={submit}
            disabled={busy}
            style={{
              width: '100%', background: '#2a6dd9', border: 'none', color: '#fff',
              borderRadius: 8, padding: '11px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'One moment…' : mode === 'login' ? 'Enter the situation room' : 'Create account & enter'}
          </button>

          <div style={{ fontSize: 11, color: '#667', marginTop: 12, textAlign: 'center' }}>
            Your games are saved under your player name.
            {mode === 'register' && ' You can rule under a different leader name in each game.'}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ marginTop: 14, width: '100%', background: 'transparent', border: '1px solid #2a2e3a', color: '#aab', borderRadius: 6, padding: '9px 12px', cursor: 'pointer' }}
            >
              Continue as guest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
