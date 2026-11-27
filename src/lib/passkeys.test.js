import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPasskeyAssertion } from './passkeys';

function buffer(bytes) {
  return Uint8Array.from(bytes).buffer;
}

function enableWebAuthn(get) {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(window, 'PublicKeyCredential', { configurable: true, value: class {} });
  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: { get },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('passkey browser flow', () => {
  it('converts server options to WebAuthn bytes and serializes the assertion', async () => {
    const get = vi.fn().mockResolvedValue({
      id: 'credential-id',
      rawId: buffer([1, 2]),
      type: 'public-key',
      authenticatorAttachment: 'platform',
      getClientExtensionResults: () => ({}),
      response: {
        clientDataJSON: buffer([3]),
        authenticatorData: buffer([4, 5]),
        signature: buffer([6]),
        userHandle: null,
      },
    });
    enableWebAuthn(get);

    const assertion = await getPasskeyAssertion({
      publicKey: {
        challenge: 'AQID',
        allowCredentials: [{ type: 'public-key', id: 'BAUG' }],
      },
    });

    expect(get).toHaveBeenCalledWith({
      publicKey: {
        challenge: Uint8Array.from([1, 2, 3]),
        allowCredentials: [{ type: 'public-key', id: Uint8Array.from([4, 5, 6]) }],
      },
    });
    expect(assertion).toMatchObject({
      id: 'credential-id',
      rawId: 'AQI',
      response: {
        clientDataJSON: 'Aw',
        authenticatorData: 'BAU',
        signature: 'Bg',
        userHandle: null,
      },
    });
  });

  it('explains when a passkey request is cancelled', async () => {
    const get = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'NotAllowedError'));
    enableWebAuthn(get);

    await expect(getPasskeyAssertion({ publicKey: { challenge: 'AQID' } }))
      .rejects.toThrow('The passkey sign-in was cancelled or timed out.');
  });
});
