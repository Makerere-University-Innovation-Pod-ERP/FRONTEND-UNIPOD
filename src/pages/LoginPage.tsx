import { useState, type FormEvent } from 'react';
import { ArrowRight, ChevronDown, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { backendApi } from '@/services/backend-api';
import { createSession, saveSession, type UserSession } from '@/lib/auth';
import { acceptGeneralRules, GENERAL_RULES, hasAcceptedGeneralRules } from '@/lib/brief';

export function LoginPage({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(() => hasAcceptedGeneralRules());
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!rulesAccepted) {
      setError('Accept the UniPod general submission rules before signing in.');
      return;
    }
    acceptGeneralRules();
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
        <p className="login-intro">Sign in to submit a brief, follow its progress and answer requests for more information.</p>
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
          <div className="login-rules">
            <button type="button" className="login-rules-toggle" onClick={() => setShowRules((value) => !value)} aria-expanded={showRules}>
              <ShieldCheck size={14} />UniPod general submission rules<ChevronDown size={14} style={{ transform: showRules ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showRules && <ul className="rules-list">{GENERAL_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>}
            <label className="rules-acceptance">
              <input type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)} />
              <span>I have read and accept the UniPod general submission rules.</span>
            </label>
          </div>
          {error && <div className="api-error" role="alert">{error}</div>}
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <LockKeyhole size={15} />}
            {busy ? 'Signing in…' : 'Sign in'}
            {!busy && <ArrowRight size={15} />}
          </button>
        </form>
        <p className="login-footnote"><b>Sign up is unavailable.</b> Accounts are provisioned by an administrator; public self-registration is disabled. Ask your UniPod contact to create an account for you.</p>
      </section>
    </main>
  );
}
