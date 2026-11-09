function base64url(input: object | string): string {
  // Keeps standard '=' padding (unlike strict base64url) so atob() in
  // lib/auth.ts's decoder — which only undoes the -/_ substitution — can
  // decode this reliably in every environment (browser, jsdom, Node).
  const json = typeof input === 'string' ? input : JSON.stringify(input);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Builds an unsigned mock JWT so the existing client-side decoder in
 * lib/auth.ts (which never verifies a signature) can derive a mock session.
 * Never used against the real backend.
 */
export function makeMockToken(roles: string[], subject: string): string {
  const header = base64url({ alg: 'none', typ: 'JWT' });
  const payload = base64url({
    sub: subject,
    name: subject,
    roles,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  });
  return `${header}.${payload}.mock-signature`;
}
