const SESSION_KEY = 'unipod.access-token';
export const SUBMISSION_INTAKE_ROLES = [
  'ROLE_ADMINISTRATOR',
  'ROLE_INNOVATION_COORDINATOR',
  'ROLE_RECEPTIONIST',
  'ROLE_FACT_FINDING_OFFICER',
];
export const SUBMISSION_CREATION_ROLES = [
  ...SUBMISSION_INTAKE_ROLES,
  'ROLE_SUBMITTER',
];

export function canCreateSubmission(roles) {
  return roles.some((role) => SUBMISSION_CREATION_ROLES.includes(role));
}

function decodePayload(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
      (character) => character.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function createSession(response, fallbackEmail) {
  const payload = decodePayload(response.accessToken);
  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  return {
    accessToken: response.accessToken,
    expiresAt: response.expiresAt,
    refreshToken: response.refreshToken,
    refreshExpiresAt: response.refreshExpiresAt,
    subject: payload?.name || payload?.email || payload?.sub || 'Signed-in user',
    email: payload?.email || response.email || fallbackEmail,
    roles: roles.map((role) => role.startsWith('ROLE_') ? role : `ROLE_${role}`),
  };
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.removeItem(SESSION_KEY);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved);
    const payload = decodePayload(session.accessToken);
    const accessTokenIsValid = payload?.exp && payload.exp * 1000 > Date.now();
    const refreshExpiresAt = session.refreshExpiresAt
      ? Date.parse(session.refreshExpiresAt)
      : null;
    const refreshTokenIsValid =
      typeof session.refreshToken === 'string' &&
      session.refreshToken.length > 0 &&
      (refreshExpiresAt === null || (Number.isFinite(refreshExpiresAt) && refreshExpiresAt > Date.now()));
    if (!accessTokenIsValid && !refreshTokenIsValid) {
      clearSession();
      return null;
    }
    const restored = { ...session, email: session.email || payload?.email };
    saveSession(restored);
    return restored;
  } catch {
    clearSession();
    return null;
  }
}

export function displayRole(role) {
  return role
    .replace(/^ROLE_/, '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
