const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (
  configuredApiUrl || 'https://backend-unipod.onrender.com/api'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = {
  token?: string;
  signal?: AbortSignal;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
};

export async function request<T>(
  path: string,
  { token, signal, body, method = body === undefined ? 'GET' : 'POST' }: RequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;
  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), 30_000);
  const abortRequest = () => timeoutController.abort();
  if (signal?.aborted) abortRequest();
  else signal?.addEventListener('abort', abortRequest, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
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

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('json')
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

  return payload as T;
}

/** Fetches a binary file (e.g. a document download) as a Blob, with the same auth/error handling as request(). */
export async function requestFile(path: string, token?: string, signal?: AbortSignal): Promise<Blob> {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
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
