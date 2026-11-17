import { useState } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Radio } from 'lucide-react';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { backendApi } from '@/services/backend-api';
import { createSession, saveSession } from '@/lib/auth';

export function LoginPage({ onLogin, onCreateAccount }) {
  const [email, setEmail] = useState('telecoms@unipod.test');
  const [password, setPassword] = useState('password');
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
    <main className={`login-screen login-screen--framed${showForgotPassword ? ' login-screen--forgot-password' : ''}`}>
      <div className="login-window">
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
          <div className="login-hero-shade" />
          <div className="login-hero-caption">
            <p className="eyebrow">MUTIC · UNIPOD</p>
            <p>Where Makerere innovators turn ideas into working prototypes.</p>
          </div>
        </aside>
      </div>
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
          <p className="eyebrow">MUTIC · UNIPOD TELECOMS</p>
          <p>RF spectrum analysis, antenna prototyping, IoT circuits and technical skilling.</p>
        </div>
      </aside>
    </main>
  );
}
