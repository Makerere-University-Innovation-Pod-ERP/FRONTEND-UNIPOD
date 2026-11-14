import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { backendApi } from '@/services/backend-api';
import { createSession, saveSession } from '@/lib/auth';

export function LoginPage({ onLogin, onCreateAccount }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const passwordInput = useRef(null);

  function handleEmailKeyDown(event) {
    if (event.key !== 'Enter' || password.trim() || !event.currentTarget.checkValidity()) return;
    event.preventDefault();
    passwordInput.current?.focus();
  }

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

  async function requestPasswordReset(event) {
    event.preventDefault();
    setResetError('');
    setResetBusy(true);
    try {
      await backendApi.forgotPassword(email.trim());
      setResetSent(true);
    } catch (reason) {
      setResetError(reason instanceof Error ? reason.message : 'Could not request a password reset.');
    } finally {
      setResetBusy(false);
    }
  }

  function returnToSignIn() {
    setShowForgotPassword(false);
    setResetSent(false);
    setResetError('');
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <img className="brand-logo" src="/makerere-logo.png" alt="Makerere University crest" />
            <div><b>MUTIC ERP</b><small>Makerere Innovation Center</small></div>
          </div>
          {showForgotPassword ? (
            <>
              <p className="eyebrow">ACCOUNT RECOVERY</p>
              <h1>Forgot password?</h1>
              <p className="login-intro">Enter your email address and we’ll send a reset link if an account exists.</p>
              {resetSent ? (
                <div className="login-reset-notice" role="status">
                  <b>Check your inbox</b>
                  <p>If an account exists for that email, a password reset link is on its way.</p>
                </div>
              ) : (
                <form className="api-form" onSubmit={requestPasswordReset}>
                  <label htmlFor="reset-email">Email address</label>
                  <input
                    id="reset-email"
                    autoComplete="username"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    autoFocus
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {resetError && <div className="api-error" role="alert">{resetError}</div>}
                  <button className="btn btn-primary login-submit" type="submit" disabled={resetBusy}>
                    {resetBusy ? <LoaderCircle className="spin" size={16} /> : <Mail size={15} />}
                    {resetBusy ? 'Sending link…' : 'Send reset link'}
                    {!resetBusy && <ArrowRight size={15} />}
                  </button>
                </form>
              )}
              <button type="button" className="btn btn-outline login-back-button" onClick={returnToSignIn}>
                <ArrowLeft size={15} />Back to sign in
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">PROJECT & IDEAS MANAGEMENT</p>
              <h1>Welcome back.</h1>
              <p className="login-intro">Sign in with your account to manage submissions and case workflows.</p>
              <form className="api-form login-form" onSubmit={submit}>
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  autoComplete="username"
                  type="email"
                  required
                  value={email}
                  onKeyDown={handleEmailKeyDown}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <label htmlFor="login-password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="login-password"
                    ref={passwordInput}
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    className="password-visibility-toggle"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div className="login-forgot-row">
                  <button
                    type="button"
                    className="login-text-button"
                    onClick={() => {
                      setError('');
                      setResetSent(false);
                      setResetError('');
                      setShowForgotPassword(true);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                {error && <div className="api-error" role="alert">{error}</div>}
                <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <LockKeyhole size={15} />}
                  {busy ? 'Signing in…' : 'Sign in'}
                  {!busy && <ArrowRight size={15} />}
                </button>
              </form>
              {onCreateAccount ? (
                <p className="login-footnote">
                  New here? <button type="button" className="btn btn-outline" onClick={onCreateAccount}>Create an account</button>
                </p>
              ) : (
                <p className="login-footnote">Public sign up is available for submitter accounts.</p>
              )}
            </>
          )}
        </div>
      </section>
      <aside className="login-hero" aria-hidden="true">
        <img src="/login-hero.jpg" alt="" />
        <div className="login-hero-caption">
          <p className="eyebrow">MUTIC · UNIPOD</p>
          <p>Where Makerere innovators turn ideas into working prototypes.</p>
        </div>
      </aside>
    </main>
  );
}
