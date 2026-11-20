import { afterEach, describe, expect, it } from 'vitest';
import {
  canCreateSubmission,
  clearSession,
  createSession,
  loadSession,
  saveSession,
} from './auth';
import { makeMockToken } from '@/mocks/jwt';

afterEach(() => {
  clearSession();
});

describe('canCreateSubmission', () => {
  it('allows submitters and intake staff to create briefs', () => {
    expect(canCreateSubmission(['ROLE_SUBMITTER'])).toBe(true);
    expect(canCreateSubmission(['ROLE_RECEPTIONIST'])).toBe(true);
  });

  describe('createSession', () => {
    it('keeps the full email address for the sidebar profile', () => {
      const email = 'alvin69david@gmail.com';
      const session = createSession({
        accessToken: makeMockToken(['ROLE_SUBMITTER'], 'alvin69david', email),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      expect(session.subject).toBe('alvin69david');
      expect(session.email).toBe(email);
    });

    it('uses the login email when the token has no email claim', () => {
      const email = 'alvin69david@gmail.com';
      const session = createSession({
        accessToken: makeMockToken(['ROLE_SUBMITTER'], 'alvin69david'),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }, email);

      expect(session.email).toBe(email);
    });

    it('preserves refresh credentials for a persistent session', () => {
      const session = createSession({
        accessToken: makeMockToken(['ROLE_SUBMITTER'], 'submitter'),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh-token',
        refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      });

      expect(session.refreshToken).toBe('refresh-token');
      expect(session.refreshExpiresAt).toBeDefined();
    });
  });

  it('restores a session from persistent storage even after its access token expires', () => {
    const tokenParts = makeMockToken(['ROLE_SUBMITTER'], 'submitter').split('.');
    const expiredPayload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    expiredPayload.exp = Math.floor(Date.now() / 1000) - 60;
    tokenParts[1] = btoa(JSON.stringify(expiredPayload)).replace(/\+/g, '-').replace(/\//g, '_');
    const session = createSession({
      accessToken: tokenParts.join('.'),
      refreshToken: 'refresh-token',
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    saveSession(session);
    sessionStorage.clear();

    expect(loadSession()).toEqual(expect.objectContaining({
      accessToken: session.accessToken,
      refreshToken: 'refresh-token',
    }));
  });

  it('does not grant submission creation to unrelated roles', () => {
    expect(canCreateSubmission(['ROLE_REVIEWER'])).toBe(false);
  });
});
