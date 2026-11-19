import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession, createSession, loadSession, saveSession } from '@/lib/auth';
import { request } from './api-client';
import { makeMockToken } from '@/mocks/jwt';

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
  };
}

afterEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});

describe('authenticated API requests', () => {
  it('renews an expired access token and retries without ending the user session', async () => {
    const oldToken = makeMockToken(['ROLE_SUBMITTER'], 'submitter');
    const [header, encodedPayload, signature] = oldToken.split('.');
    const expiredPayload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
    expiredPayload.exp = Math.floor(Date.now() / 1000) - 60;
    const expiredEncodedPayload = btoa(JSON.stringify(expiredPayload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const expiredToken = `${header}.${expiredEncodedPayload}.${signature}`;
    const newToken = makeMockToken(['ROLE_SUBMITTER'], 'submitter');
    saveSession(createSession({
      accessToken: expiredToken,
      refreshToken: 'refresh-before-use',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }, 'submitter@example.test'));

    const fetchMock = vi.fn(async (url, options) => {
      if (String(url).endsWith('/auth/refresh')) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return jsonResponse(200, {
          accessToken: newToken,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          refreshToken: 'rotated-refresh-token',
          refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        });
      }
      if (options.headers.get('Authorization') === `Bearer ${expiredToken}`) {
        return jsonResponse(401, { detail: 'Expired access token' });
      }
      return jsonResponse(200, { ok: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(Promise.all([
      request('/protected', { token: expiredToken }),
      request('/another-protected-resource', { token: expiredToken }),
    ])).resolves.toEqual([{ ok: true }, { ok: true }]);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
    expect(loadSession()).toEqual(expect.objectContaining({
      accessToken: newToken,
      refreshToken: 'rotated-refresh-token',
    }));
  });
});
