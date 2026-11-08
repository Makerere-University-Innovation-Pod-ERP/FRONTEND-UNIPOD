import { API_BASE_URL, ApiError, request } from './api-client';

export { API_BASE_URL, ApiError };

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
