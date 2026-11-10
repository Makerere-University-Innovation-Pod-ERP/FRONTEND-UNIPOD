import { useState } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-react';
import { backendApi } from '@/services/backend-api';
import { createSession, saveSession } from '@/lib/auth';

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = createSession(await backendApi.login(email.trim(), password));
      saveSession(session);
      onLogin(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
          <div><b>INNOVATION HUB</b><small>Makerere University</small></div>
        </div>
        <p className="eyebrow">PROJECT & IDEAS MANAGEMENT</p>
        <h1>Welcome back.</h1>
        <p className="login-intro">Sign in with your administrator-provisioned account to manage submissions and case workflows.</p>
        <form className="api-form" onSubmit={submit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            autoComplete="username"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            {busy ? 'Signing in…' : 'Sign in'}
            {!busy && <ArrowRight size={15} />}
          </button>
        </form>
        <p className="login-footnote">Accounts are provisioned by an administrator. Public registration is disabled.</p>
      </section>
    </main>
  );
}
