import { useState } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Radio } from 'lucide-react';
import { backendApi } from '@/services/backend-api';
import { createSession, saveSession } from '@/lib/auth';

export function LoginPage({ onLogin, onCreateAccount }) {
  const [email, setEmail] = useState('telecoms@unipod.test');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function performLogin(loginEmail, loginPassword) {
    setError('');
    setBusy(true);
    try {
      const session = createSession(await backendApi.login(loginEmail.trim(), loginPassword));
      saveSession(session);
      onLogin(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    void performLogin(email, password);
  }

  function signInAsTelecoms() {
    setEmail('telecoms@unipod.test');
    setPassword('password');
    void performLogin('telecoms@unipod.test', 'password');
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <img src="/mak-crest.png" alt="Makerere University" className="brand-crest" />
            <div><b>TELECOMS ERP</b><small>Makerere University · UniPod</small></div>
          </div>
          <p className="eyebrow">TELECOMS OPERATIONS · DOMAIN 6</p>
          <h1>Welcome back.</h1>
          <p className="login-intro">Sign in as Telecoms Domain Owner (Eng. Kaddu) to manage RF service requests, lab booking, equipment lending, bootcamps and parts inventory.</p>
          <form className="api-form" onSubmit={submit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              autoComplete="username"
              type="text"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="telecoms@unipod.test"
            />
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <div className="api-error" role="alert">{error}</div>}
            <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <LockKeyhole size={15} />}
              {busy ? 'Signing in…' : 'Sign in to Telecoms Portal'}
              {!busy && <ArrowRight size={15} />}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                width: '100%',
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderColor: '#176b52',
                color: '#176b52',
                fontWeight: 700,
              }}
              onClick={signInAsTelecoms}
              disabled={busy}
            >
              <Radio size={15} /> Quick Sign-in as Telecoms Owner (Eng. Kaddu)
            </button>
          </form>
          {onCreateAccount ? (
            <p className="login-footnote">
              New here? <button type="button" className="btn btn-outline" onClick={onCreateAccount}>Create an account</button>
            </p>
          ) : (
            <p className="login-footnote">Telecoms Domain Owner: <code>telecoms@unipod.test</code> (Eng. Kaddu)</p>
          )}
        </div>
      </section>
      <aside className="login-hero" aria-hidden="true">
        <img src="/login-hero.jpg" alt="" />
        <div className="login-hero-caption">
          <p className="eyebrow">MUTIC · UNIPOD TELECOMS</p>
          <p>RF spectrum analysis, antenna prototyping, IoT circuits and technical skilling.</p>
        </div>
      </aside>
    </main>
  );
}
