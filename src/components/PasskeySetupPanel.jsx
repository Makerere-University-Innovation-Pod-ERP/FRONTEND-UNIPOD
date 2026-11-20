import { useState } from 'react';
import { Fingerprint, LoaderCircle, ShieldCheck } from 'lucide-react';
import { saveSession } from '@/lib/auth';
import { createPasskeyCredential } from '@/lib/passkeys';
import { backendApi } from '@/services/backend-api';

export function PasskeySetupPanel({ session, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function continueWithPassword() {
    saveSession(session);
    onDone(session);
  }

  async function setUpPasskey() {
    setError('');
    setBusy(true);
    try {
      const challenge = await backendApi.passkeyRegistrationOptions(session.accessToken);
      const credential = await createPasskeyCredential(challenge.options);
      await backendApi.finishPasskeyRegistration(session.accessToken, {
        challengeId: challenge.challengeId,
        credential,
      });
      saveSession(session);
      onDone(session);
    } catch (reason) {
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
      {error && <div className="api-error" role="alert">{error}</div>}
      <button
        className="btn btn-primary login-submit"
        type="button"
        onClick={() => void setUpPasskey()}
        disabled={busy}
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
