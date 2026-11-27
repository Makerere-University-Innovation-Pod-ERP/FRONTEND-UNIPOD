import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as passkeys from '@/lib/passkeys';
import { backendApi } from '@/services/backend-api';
import { PasskeySetupPanel } from './PasskeySetupPanel';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('PasskeySetupPanel', () => {
  it('registers a passkey before continuing into the new session', async () => {
    const user = userEvent.setup();
    const session = { accessToken: 'new-session-token' };
    const onDone = vi.fn();
    const options = vi.spyOn(backendApi, 'passkeyRegistrationOptions').mockResolvedValue({
      challengeId: 'registration-challenge',
      options: { publicKey: {} },
    });
    vi.spyOn(passkeys, 'createPasskeyCredential').mockResolvedValue({ id: 'new-credential' });
    const verify = vi.spyOn(backendApi, 'finishPasskeyRegistration').mockResolvedValue(undefined);
    render(<PasskeySetupPanel session={session} onDone={onDone} />);

    await user.type(screen.getByLabelText('Confirm your password to set up a passkey'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Set up passkey' }));

    await waitFor(() => expect(verify).toHaveBeenCalledWith('new-session-token', {
      challengeId: 'registration-challenge',
      credential: { id: 'new-credential' },
      password: 'correct-password',
    }));
    expect(options).toHaveBeenCalledWith('new-session-token', 'correct-password');
    expect(onDone).toHaveBeenCalledWith(session);
    expect(sessionStorage.getItem('unipod.access-token')).toContain('new-session-token');
    expect(localStorage.getItem('unipod.access-token')).toBeNull();
  });
});
