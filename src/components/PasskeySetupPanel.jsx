import { useState } from 'react';
import { Fingerprint, LoaderCircle, ShieldCheck } from 'lucide-react';
import { saveSession } from '@/lib/auth';
import { createPasskeyCredential } from '@/lib/passkeys';
import { backendApi } from '@/services/backend-api';

export function PasskeySetupPanel({ session, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  function continueWithPassword() {
    setPassword('');
    saveSession(session);
    onDone(session);
  }

  async function setUpPasskey() {
    setError('');
    setBusy(true);
    try {
      const challenge = await backendApi.passkeyRegistrationOptions(session.accessToken, password);
      const credential = await createPasskeyCredential(challenge.options);
      await backendApi.finishPasskeyRegistration(session.accessToken, {
        challengeId: challenge.challengeId,
        credential,
        password,
      });
      setPassword('');
      saveSession(session);
      onDone(session);
    } catch (reason) {
      setPassword('');
      setError(reason instanceof Error ? reason.message : 'Could not set up a passkey.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="passkey-setup" aria-labelledby="passkey-setup-title">
      <div className="passkey-setup-icon"><Fingerprint size={22} /></div>
      <p className="eyebrow">OPTIONAL ACCOUNT SECURITY</p>
      <h1 id="passkey-setup-title">Set up a passkey?</h1>
      <p className="login-intro">
        Sign in on this device with its screen lock, fingerprint, or face recognition.
        Your biometric data stays on your device; your password will still work.
      </p>
      <label htmlFor="passkey-setup-password">Confirm your password to set up a passkey</label>
      <input
        id="passkey-setup-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={busy}
      />
      {error && <div className="api-error" role="alert">{error}</div>}
      <button
        className="btn btn-primary login-submit"
        type="button"
        onClick={() => void setUpPasskey()}
        disabled={busy || !password.trim()}
      >
        {busy ? <LoaderCircle className="spin" size={16} /> : <Fingerprint size={16} />}
        {busy ? 'Setting up passkey…' : 'Set up passkey'}
      </button>
      <button
        className="btn btn-outline passkey-continue"
        type="button"
        onClick={continueWithPassword}
        disabled={busy}
      >
        <ShieldCheck size={15} />Continue with password
      </button>
    </section>
  );
}
