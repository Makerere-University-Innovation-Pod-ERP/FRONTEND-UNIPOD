const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (
  configuredApiUrl ||
  'https://backend-unipod.onrender.com/api'
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
  operations: {
    availability: string;
    reason: string | null;
    equipmentUnderRepair: number | null;
    bookingsToday: number | null;
    facilitiesFreeNow: number | null;
  } | null;
  finance: {
    availability: string;
    reason: string | null;
    incomeMonthToDate: number | null;
    incomeBars: Array<{ period: string; income: number }>;
  } | null;
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
  notificationEmail: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SectorFilterOption = Pick<Sector, 'id' | 'name'>;

export type ApiUserRole =
  | 'ADMINISTRATOR'
  | 'INNOVATION_COORDINATOR'
  | 'RECEPTIONIST'
  | 'FACT_FINDING_OFFICER'
  | 'REVIEWER'
  | 'SECTOR_OFFICER'
  | 'IP_LIAISON'
  | 'SUBMITTER'
  | 'OBSERVER';

export type ApiUser = {
  id: string;
  email: string;
  role: ApiUserRole;
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  submissionId: string;
  name: string;
  status: string;
  fileReference: string | null;
  contentType: string | null;
  fileSize: number | null;
  originalFilename: string | null;
  createdBy: string;
  createdAt: string;
};

export type ReceptionQueue = PageResponse<Submission> & {
  inQueueCount: number;
  awaitingActionCount: number;
  recentlyUpdatedCount: number;
};

export type SubmitterCapabilities = {
  canRegisterSubmission: boolean;
  registrationMessage: string;
  lockedModules: string[];
};

export type SubmitterSubmission = {
  id: string;
  code: string | null;
  category: 'student' | 'general';
  title: string;
  purpose: string;
  problemAddressed: string;
  studentNumber: string | null;
  programme: string | null;
  supervisor: string | null;
  recommendationLetterStatus: string | null;
  stage: string;
  receivedAt: string | null;
  forwardedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseFile = {
  submission: Submission;
  currentStage: string;
  reference: string | null;
  documents: DocumentRecord[];
  stageHistory: Array<{
    fromStage: string | null;
    toStage: string;
    changedBy: string;
    changedAt: string;
    note: string | null;
  }>;
  stepper: Array<{ stage: string; state: string }>;
  outcome: {
    status: string;
    decision: string | null;
    note: string | null;
    decidedBy: string | null;
    decidedAt: string | null;
  } | null;
  capabilities: {
    nextStep: { enabled: boolean; reason: string | null };
    saveOutcome: { enabled: boolean; reason: string | null };
    updateDocumentStatus: { enabled: boolean; reason: string | null };
  };
  transitionOptions: { allowedTransitions: string[] };
  reviewPanel?: {
    availability: string;
    reviewerTeam: string[];
    ipPanel: string[];
    quorumAvailable: boolean;
    quorumMet: boolean;
  };
  activity?: {
    availability: string;
    items: Array<{ occurredAt: string; actor: string; action: string; summary: string }>;
  };
};

type RequestOptions = {
  token?: string;
  signal?: AbortSignal;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
};

async function request<T>(
  path: string,
  { token, signal, body, method = body === undefined ? 'GET' : 'POST' }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
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

async function requestFile(path: string, token: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
  });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const payload: unknown = contentType.includes('json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');
    const bodyMessage =
      typeof payload === 'object' && payload !== null && 'detail' in payload &&
      typeof payload.detail === 'string'
        ? payload.detail
        : null;
    throw new ApiError(bodyMessage || `The API request failed (${response.status}).`, response.status);
  }
  return response.blob();
}

export const backendApi = {
  health: (signal?: AbortSignal) =>
    request<{ status: string }>('/actuator/health', { signal }),
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { body: { email, password } }),
  createUser: (token: string, body: { email: string; password: string; role: ApiUserRole }) =>
    request<ApiUser>('/admin/users', { token, body }),
  dashboard: (token: string, signal?: AbortSignal) =>
    request<DashboardOverview>('/dashboard/overview', { token, signal }),
  submissions: (
    token: string,
    options: { page?: number; size?: number; q?: string; category?: string; stage?: string; sector?: string } = {},
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams({
      page: String(options.page ?? 0),
      size: String(options.size ?? 25),
    });
    if (options.q?.trim()) query.set('q', options.q.trim());
    if (options.category) query.set('category', options.category);
    if (options.stage) query.set('stage', options.stage);
    if (options.sector) query.set('sector', options.sector);
    return request<PageResponse<Submission>>(`/submissions?${query}`, { token, signal });
  },
  searchSubmissions: (token: string, code: string, page = 0, size = 25, signal?: AbortSignal) => {
    const query = new URLSearchParams({ code, page: String(page), size: String(size) });
    return request<PageResponse<Submission>>(`/submissions/search?${query}`, { token, signal });
  },
  mySubmissions: (token: string, page = 0, size = 25) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request<PageResponse<Submission>>(`/submissions/mine?${query}`, { token });
  },
  submitterSubmissions: (token: string, page = 0, size = 25, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request<PageResponse<SubmitterSubmission>>(`/me/submissions?${query}`, { token, signal });
  },
  submitterCapabilities: (token: string, signal?: AbortSignal) =>
    request<SubmitterCapabilities>('/me/capabilities', { token, signal }),
  createSubmission: (token: string, body: Record<string, unknown>) =>
    request<Submission>('/submissions', { token, body }),
  submissionCaseFile: (token: string, id: string, signal?: AbortSignal) =>
    request<{ submission: Submission; documents: DocumentRecord[]; stageHistory: CaseFile['stageHistory'] }>(
      `/submissions/${encodeURIComponent(id)}`,
      { token, signal },
    ),
  caseFile: (token: string, id: string, signal?: AbortSignal) =>
    request<CaseFile>(`/cases/${encodeURIComponent(id)}`, { token, signal }),
  caseCapabilities: (token: string, id: string, signal?: AbortSignal) =>
    request<CaseFile['capabilities']>(`/cases/${encodeURIComponent(id)}/capabilities`, { token, signal }),
  allowedTransitions: (token: string, id: string, signal?: AbortSignal) =>
    request<{ allowedTransitions: string[] }>(
      `/cases/${encodeURIComponent(id)}/transitions/allowed`,
      { token, signal },
    ),
  sectors: (token: string, signal?: AbortSignal) =>
    request<Sector[]>('/sectors', { token, signal }),
  sectorCatalog: (token: string) =>
    request<Sector[]>('/sectors/catalog', { token }),
  sectorFilterOptions: (token: string, signal?: AbortSignal) =>
    request<SectorFilterOption[]>('/sectors/filter-options', { token, signal }),
  createSector: (token: string, body: { name: string; notificationEmail: string; active: boolean }) =>
    request<Sector>('/sectors', { token, body }),
  updateSector: (
    token: string,
    id: string,
    body: { name: string; notificationEmail: string; active: boolean; version: number },
  ) => request<Sector>(`/sectors/${encodeURIComponent(id)}`, { token, method: 'PUT', body }),
  sectorMembers: (token: string, id: string) =>
    request<string[]>(`/sectors/${encodeURIComponent(id)}/members`, { token }),
  addSectorMember: (token: string, id: string, subject: string) =>
    request<string>(`/sectors/${encodeURIComponent(id)}/members`, { token, body: { subject } }),
  removeSectorMember: (token: string, id: string, subject: string) => {
    const query = new URLSearchParams({ subject });
    return request<void>(`/sectors/${encodeURIComponent(id)}/members?${query}`, {
      token,
      method: 'DELETE',
    });
  },
  receptionQueue: (token: string, page = 0, size = 25, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request<ReceptionQueue>(`/queues/reception?${query}`, { token, signal });
  },
  register: (token: string, id: string) =>
    request<Submission>(`/submissions/${encodeURIComponent(id)}/register`, { token, method: 'POST' }),
  forward: (token: string, id: string, sectorId: string) =>
    request<Submission>(`/submissions/${encodeURIComponent(id)}/forward`, {
      token,
      body: { sectorId },
    }),
  advanceSubmission: (token: string, id: string, stage: 'IN_PROGRESS' | 'COMPLETED') =>
    request<Submission>(`/submissions/${encodeURIComponent(id)}/transition`, {
      token,
      body: { stage },
    }),
  assignReviewer: (token: string, id: string, subject: string | null) =>
    request<Submission>(`/submissions/${encodeURIComponent(id)}/reviewer`, {
      token,
      method: 'PUT',
      body: { subject },
    }),
  addDocument: (
    token: string,
    id: string,
    body: { name: string; status: string; fileReference?: string },
  ) => request<DocumentRecord>(`/submissions/${encodeURIComponent(id)}/documents`, { token, body }),
  uploadDocument: (token: string, id: string, formData: FormData) =>
    request<DocumentRecord>(`/submissions/${encodeURIComponent(id)}/documents/upload`, {
      token,
      body: formData,
    }),
  downloadDocument: (token: string, id: string, documentId: string) =>
    requestFile(
      `/submissions/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/file`,
      token,
    ),
  transition: (
    token: string,
    id: string,
    body: { to_stage: string; note?: string; version: number },
  ) =>
    request<CaseFile>(`/cases/${encodeURIComponent(id)}/transitions`, {
      token,
      body,
    }),
  saveOutcome: (
    token: string,
    id: string,
    body: { decision?: string; note?: string; version: number },
  ) => request<CaseFile>(`/cases/${encodeURIComponent(id)}/outcome`, { token, method: 'PUT', body }),
  updateDocumentStatus: (
    token: string,
    id: string,
    documentId: string,
    body: { status: string; version: number },
  ) => request<CaseFile>(
    `/cases/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`,
    { token, method: 'PATCH', body },
  ),
};
