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

export type LoginResponse = {
  tokenType: string;
  accessToken: string;
  expiresAt: string;
};

export type Submission = {
  id: string;
  code: string | null;
  category: 'student' | 'general';
  title: string;
  purpose: string;
  problemAddressed: string;
  registeredBy: string;
  submitterId: string | null;
  receivingOfficer: string | null;
  assignedReviewerSubject: string | null;
  studentNumber: string | null;
  programme: string | null;
  supervisor: string | null;
  recommendationLetterStatus: string | null;
  responsibleSectorId: string | null;
  responsibleSectorName: string | null;
  stage: string;
  receivedAt: string | null;
  forwardedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type DashboardOverview = {
  totalSubmissions: number;
  byStage: Record<string, number>;
  studentSubmissions: number;
  generalSubmissions: number;
  awaitingActionCount: number;
  forwardedCount: number;
  completedCount: number;
  recentlyUpdatedCount: number;
  awaitingReviewCount: number;
  refinementRequestedCount: number;
  pipelineAtAGlance: Record<string, number>;
  needsAttention: Array<{
    id: string;
    code: string | null;
    title: string;
    stage: string;
    reason: string;
    updatedAt: string;
  }>;
  operations: { availability: string; reason: string | null } | null;
  finance: { availability: string; reason: string | null } | null;
  recentActivity: {
    availability: string;
    reason: string | null;
    items: Array<{
      occurredAt: string;
      actor: string;
      action: string;
      summary: string;
    }>;
  } | null;
};

export type Sector = {
  id: string;
  name: string;
  active: boolean;
};

export type CaseFile = {
  submission: Submission;
  currentStage: string;
  reference: string | null;
  documents: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string | null;
  }>;
  stageHistory: Array<{
    fromStage: string | null;
    toStage: string;
    changedBy: string;
    changedAt: string;
    note: string | null;
  }>;
  stepper: Array<{ stage: string; state: string }>;
  outcome: { status: string; decision: string | null; note: string | null } | null;
  capabilities: {
    nextStep: { enabled: boolean; reason: string | null };
    saveOutcome: { enabled: boolean; reason: string | null };
    updateDocumentStatus: { enabled: boolean; reason: string | null };
  };
  transitionOptions: { allowedTransitions: string[] };
};

type RequestOptions = {
  token?: string;
  signal?: AbortSignal;
  body?: unknown;
  method?: 'GET' | 'POST';
};

async function request<T>(
  path: string,
  { token, signal, body, method = body === undefined ? 'GET' : 'POST' }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
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
      body: body === undefined ? undefined : JSON.stringify(body),
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

export const backendApi = {
  health: (signal?: AbortSignal) =>
    request<{ status: string }>('/actuator/health', { signal }),
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { body: { email, password } }),
  dashboard: (token: string, signal?: AbortSignal) =>
    request<DashboardOverview>('/dashboard/overview', { token, signal }),
  submissions: (
    token: string,
    options: { page?: number; size?: number; q?: string; category?: string; stage?: string } = {},
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams({
      page: String(options.page ?? 0),
      size: String(options.size ?? 25),
    });
    if (options.q?.trim()) query.set('q', options.q.trim());
    if (options.category) query.set('category', options.category);
    if (options.stage) query.set('stage', options.stage);
    return request<PageResponse<Submission>>(`/submissions?${query}`, { token, signal });
  },
  createSubmission: (token: string, body: Record<string, unknown>) =>
    request<Submission>('/submissions', { token, body }),
  caseFile: (token: string, id: string, signal?: AbortSignal) =>
    request<CaseFile>(`/cases/${encodeURIComponent(id)}`, { token, signal }),
  allowedTransitions: (token: string, id: string, signal?: AbortSignal) =>
    request<{ allowedTransitions: string[] }>(
      `/cases/${encodeURIComponent(id)}/transitions/allowed`,
      { token, signal },
    ),
  sectors: (token: string, signal?: AbortSignal) =>
    request<Sector[]>('/sectors', { token, signal }),
  register: (token: string, id: string) =>
    request<Submission>(`/submissions/${encodeURIComponent(id)}/register`, { token, method: 'POST' }),
  forward: (token: string, id: string, sectorId: string) =>
    request<Submission>(`/submissions/${encodeURIComponent(id)}/forward`, {
      token,
      body: { sectorId },
    }),
  transition: (
    token: string,
    id: string,
    body: { to_stage: string; note: string; version: number },
  ) =>
    request<CaseFile>(`/cases/${encodeURIComponent(id)}/transitions`, {
      token,
      body,
    }),
};
