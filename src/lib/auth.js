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

export function createSession(response) {
  const payload = decodePayload(response.accessToken);
  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  return {
    accessToken: response.accessToken,
    expiresAt: response.expiresAt,
    subject: payload?.name || payload?.email || payload?.sub || 'Signed-in user',
    roles: roles.map((role) => role.startsWith('ROLE_') ? role : `ROLE_${role}`),
  };
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved);
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

export function displayRole(role) {
  return role
    .replace(/^ROLE_/, '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
