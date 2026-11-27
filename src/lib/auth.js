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

export function getRoleLandingPath(roles) {
  if (roles.includes('ROLE_ADMINISTRATOR')) return '/';
  if (roles.includes('ROLE_TELECOMS_DOMAIN_OWNER')) return '/telecoms/requests';
  if (roles.includes('ROLE_SUBMITTER')) return '/my-submissions';
  if (roles.includes('ROLE_RECEPTIONIST')) return '/reception/home';
  if (roles.includes('ROLE_FACT_FINDING_OFFICER')) return '/fact-finding/queue';
  if (roles.includes('ROLE_REVIEWER')) return '/reviewer/workspace';
  if (roles.includes('ROLE_INNOVATION_COORDINATOR')) return '/coordinator';
  if (roles.includes('ROLE_FINANCE_OFFICER')) return '/finance/overview';
  if (roles.includes('ROLE_MULTIMEDIA_OFFICER')) return '/multimedia/media';
  if (roles.includes('ROLE_TEXTILE_DOMAIN_OWNER')) return '/textile/board';
  if (roles.includes('ROLE_CNC_DOMAIN_OWNER')) return '/cnc/board';
  return '/';
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

function getIdentityClaim(token) {
  const payload = decodePayload(token);
  if (typeof payload?.sub === 'string' && payload.sub.trim()) {
    return `sub:${payload.sub.trim()}`;
  }
  if (typeof payload?.email === 'string' && payload.email.trim()) {
    return `email:${payload.email.trim().toLowerCase()}`;
  }
  return null;
}

function fingerprintToken(token) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < token.length; index += 1) {
    const code = token.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

export function getAccountIdentity(token) {
  if (typeof token !== 'string' || !token) return null;
  return getIdentityClaim(token) ?? `token:${fingerprintToken(token)}`;
}

export function isSameAccount(firstToken, secondToken) {
  if (!firstToken || !secondToken) return false;
  const firstIdentity = getIdentityClaim(firstToken);
  const secondIdentity = getIdentityClaim(secondToken);
  return firstIdentity && secondIdentity
    ? firstIdentity === secondIdentity
    : firstToken === secondToken;
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
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function loadSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
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
