import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as passkeys from '@/lib/passkeys';
import { backendApi } from '@/services/backend-api';
import { PasskeySetupPanel } from './PasskeySetupPanel';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('PasskeySetupPanel', () => {
  it('registers a passkey before continuing into the new session', async () => {
    const user = userEvent.setup();
    const session = { accessToken: 'new-session-token' };
    const onDone = vi.fn();
    vi.spyOn(backendApi, 'passkeyRegistrationOptions').mockResolvedValue({
      challengeId: 'registration-challenge',
      options: { publicKey: {} },
    });
    vi.spyOn(passkeys, 'createPasskeyCredential').mockResolvedValue({ id: 'new-credential' });
    const verify = vi.spyOn(backendApi, 'finishPasskeyRegistration').mockResolvedValue(undefined);
    render(<PasskeySetupPanel session={session} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: 'Set up passkey' }));

    await waitFor(() => expect(verify).toHaveBeenCalledWith('new-session-token', {
      challengeId: 'registration-challenge',
      credential: { id: 'new-credential' },
    }));
    expect(onDone).toHaveBeenCalledWith(session);
    expect(localStorage.getItem('unipod.access-token')).toContain('new-session-token');
  });
});
