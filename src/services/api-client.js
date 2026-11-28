import {
  clearSession,
  createSession,
  getAccountIdentity,
  isSameAccount,
  loadSession,
  saveSession,
} from '@/lib/auth';

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (
  configuredApiUrl || 'https://backend-unipod.onrender.com/api'
).replace(/\/+$/, '');
const SESSION_REFRESHED_EVENT = 'unipod:session-refreshed';
const refreshesInFlight = new Map();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function performRequest(
  path,
  { token, signal, body, method = body === undefined ? 'GET' : 'POST' } = {},
) {
  const isFormData = body instanceof FormData;
  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), 30_000);
  const abortRequest = () => timeoutController.abort();
  if (signal?.aborted) abortRequest();
  else signal?.addEventListener('abort', abortRequest, { once: true });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: timeoutController.signal,
      credentials: 'omit',
    });
  } catch (reason) {
    if (signal?.aborted) throw reason;
    if (timeoutController.signal.aborted) {
      throw new ApiError('The backend did not respond in time. Please try again.', 0);
    }
    throw new ApiError(
      'Could not reach the backend. Check the service status and its allowed CORS origins.',
      0,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }

  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const bodyMessage =
      typeof payload === 'object' && payload !== null
        ? ('detail' in payload && typeof payload.detail === 'string'
            ? payload.detail
            : 'message' in payload && typeof payload.message === 'string'
              ? payload.message
              : 'title' in payload && typeof payload.title === 'string'
                ? payload.title
                : null)
        : null;
    const message =
      bodyMessage ||
      (response.status === 401
        ? 'Your session has expired. Sign in again.'
        : response.status === 403
          ? 'Your account does not have permission to perform this action.'
          : `The API request failed (${response.status}).`);
    throw new ApiError(message, response.status);
  }

  return payload;
}

async function refreshSession(token) {
  const identity = getAccountIdentity(token);
  const inFlight = refreshesInFlight.get(identity);
  if (inFlight) {
    const refreshed = await inFlight;
    if (refreshed && isSameAccount(token, refreshed.accessToken)) return refreshed;
  }

  const renew = async () => {
    const current = loadSession();
    if (!current) return null;
    if (current.accessToken !== token) {
      return isSameAccount(token, current.accessToken) ? current : null;
    }
    if (!current.refreshToken) return null;

    const stillCurrent = () => {
      const session = loadSession();
      return session?.accessToken === current.accessToken &&
        session?.refreshToken === current.refreshToken;
    };

    let response;
    try {
      response = await request('/auth/refresh', {
        body: { refreshToken: current.refreshToken },
      });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401 && stillCurrent()) {
        clearSession();
      }
      throw reason;
    }

    if (!stillCurrent()) {
      const latest = loadSession();
      return latest && isSameAccount(token, latest.accessToken) ? latest : null;
    }
    if (!response.refreshToken) {
      if (stillCurrent()) clearSession();
      throw new ApiError('Your session could not be renewed. Sign in again.', 401);
    }
    if (!isSameAccount(token, response.accessToken)) {
      if (stillCurrent()) clearSession();
      throw new ApiError('Your session could not be renewed. Sign in again.', 401);
    }

    const nextSession = createSession(response, current.email);
    saveSession(nextSession);
    window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT, { detail: nextSession }));
    return nextSession;
  };
  const runWithLock = () => (
    typeof navigator !== 'undefined' && navigator.locks?.request
      ? navigator.locks.request('unipod-auth-refresh', renew)
      : renew()
  );
  const refreshPromise = runWithLock();
  refreshesInFlight.set(identity, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    if (refreshesInFlight.get(identity) === refreshPromise) {
      refreshesInFlight.delete(identity);
    }
  }
}

function getCurrentRefreshResult(token, refreshed) {
  const current = loadSession();
  return current &&
    current.accessToken === refreshed.accessToken &&
    isSameAccount(token, current.accessToken);
}

export async function request(path, options = {}) {
  try {
    return await performRequest(path, options);
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 401 || !options.token) throw reason;

    let refreshed;
    try {
      refreshed = await refreshSession(options.token);
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) throw reason;
      throw refreshError;
    }
    if (!refreshed || !getCurrentRefreshResult(options.token, refreshed)) throw reason;
    return performRequest(path, { ...options, token: refreshed.accessToken });
  }
}

/** Fetches a binary file (e.g. a document download) as a Blob, with the same auth/error handling as request(). */
async function performRequestFile(path, token, signal) {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers, signal, credentials: 'omit' });
  } catch (reason) {
    if (signal?.aborted) throw reason;
    throw new ApiError('Could not reach the backend to download this file.', 0);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status === 401
        ? 'Your session has expired. Sign in again.'
        : response.status === 403
          ? 'Your account does not have permission to download this file.'
          : `The file download failed (${response.status}).`,
      response.status,
    );
  }

  return response.blob();
}

export async function requestFile(path, token, signal) {
  try {
    return await performRequestFile(path, token, signal);
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 401 || !token) throw reason;

    let refreshed;
    try {
      refreshed = await refreshSession(token);
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) throw reason;
      throw refreshError;
    }
    if (!refreshed || !getCurrentRefreshResult(token, refreshed)) throw reason;
    return performRequestFile(path, refreshed.accessToken, signal);
  }
}
