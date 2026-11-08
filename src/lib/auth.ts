import type { LoginResponse } from '@/services/backend-api';

const SESSION_KEY = 'unipod.access-token';
export const SUBMISSION_INTAKE_ROLES = [
  'ROLE_ADMINISTRATOR',
  'ROLE_INNOVATION_COORDINATOR',
  'ROLE_RECEPTIONIST',
  'ROLE_FACT_FINDING_OFFICER',
];

export type UserSession = {
  accessToken: string;
  expiresAt: string;
  subject: string;
  roles: string[];
};

type JwtPayload = {
  sub?: string;
  exp?: number;
  email?: string;
  name?: string;
  roles?: string[];
};

function decodePayload(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
      (character) => character.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

export function createSession(response: LoginResponse): UserSession {
  const payload = decodePayload(response.accessToken);
  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  return {
    accessToken: response.accessToken,
    expiresAt: response.expiresAt,
    subject: payload?.name || payload?.email || payload?.sub || 'Signed-in user',
    roles: roles.map((role) => role.startsWith('ROLE_') ? role : `ROLE_${role}`),
  };
}

export function saveSession(session: UserSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadSession(): UserSession | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved) as UserSession;
    const payload = decodePayload(session.accessToken);
    if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function displayRole(role: string): string {
  return role
    .replace(/^ROLE_/, '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
