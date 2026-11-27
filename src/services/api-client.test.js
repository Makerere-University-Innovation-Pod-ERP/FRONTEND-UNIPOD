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

  it('does not retry a stale request with a different account session', async () => {
    const oldToken = makeMockToken(['ROLE_SUBMITTER'], 'account-one');
    const newToken = makeMockToken(['ROLE_SUBMITTER'], 'account-two');
    saveSession(createSession({
      accessToken: oldToken,
      refreshToken: 'account-one-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));

    let releaseProtected;
    const protectedStarted = new Promise((resolve) => {
      releaseProtected = resolve;
    });
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/protected')) {
        await protectedStarted;
        return jsonResponse(401, { detail: 'Expired access token' });
      }
      return jsonResponse(200, {});
    });
    vi.stubGlobal('fetch', fetchMock);

    const pendingRequest = request('/protected', { token: oldToken });
    saveSession(createSession({
      accessToken: newToken,
      refreshToken: 'account-two-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    releaseProtected();

    await expect(pendingRequest).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loadSession().accessToken).toBe(newToken);
  });

  it('does not clear a newer session when an old refresh fails', async () => {
    const oldToken = makeMockToken(['ROLE_SUBMITTER'], 'account-one');
    const newToken = makeMockToken(['ROLE_SUBMITTER'], 'account-two');
    saveSession(createSession({
      accessToken: oldToken,
      refreshToken: 'account-one-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));

    let releaseRefresh;
    let refreshStarted;
    const started = new Promise((resolve) => {
      refreshStarted = resolve;
    });
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshStarted();
        return new Promise((resolve) => {
          releaseRefresh = resolve;
        });
      }
      return jsonResponse(401, { detail: 'Expired access token' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pendingRequest = request('/protected', { token: oldToken });
    await started;
    saveSession(createSession({
      accessToken: newToken,
      refreshToken: 'account-two-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    releaseRefresh(jsonResponse(401, { detail: 'Refresh token expired' }));

    await expect(pendingRequest).rejects.toMatchObject({ status: 401 });
    expect(loadSession().accessToken).toBe(newToken);
  });

  it('does not overwrite a newer session when an old refresh succeeds late', async () => {
    const oldToken = makeMockToken(['ROLE_SUBMITTER'], 'account-one');
    const newToken = makeMockToken(['ROLE_SUBMITTER'], 'account-two');
    saveSession(createSession({
      accessToken: oldToken,
      refreshToken: 'account-one-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));

    let releaseRefresh;
    let refreshStarted;
    const started = new Promise((resolve) => {
      refreshStarted = resolve;
    });
    const refreshedToken = makeMockToken(['ROLE_SUBMITTER'], 'account-one');
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshStarted();
        return new Promise((resolve) => {
          releaseRefresh = resolve;
        });
      }
      return jsonResponse(401, { detail: 'Expired access token' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pendingRequest = request('/protected', { token: oldToken });
    await started;
    saveSession(createSession({
      accessToken: newToken,
      refreshToken: 'account-two-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    releaseRefresh(jsonResponse(200, {
      accessToken: refreshedToken,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshToken: 'rotated-account-one-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));

    await expect(pendingRequest).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loadSession().accessToken).toBe(newToken);
  });

  it('rejects refresh credentials that return a different account token', async () => {
    const oldToken = makeMockToken(['ROLE_SUBMITTER'], 'account-one');
    const otherAccountToken = makeMockToken(['ROLE_SUBMITTER'], 'account-two');
    saveSession(createSession({
      accessToken: oldToken,
      refreshToken: 'account-one-refresh',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/auth/refresh')) {
        return jsonResponse(200, {
          accessToken: otherAccountToken,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          refreshToken: 'account-two-refresh',
          refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        });
      }
      return jsonResponse(401, { detail: 'Expired access token' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/protected', { token: oldToken }))
      .rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loadSession()).toBeNull();
  });
});
