import { API_BASE_URL, ApiError, request, requestFile } from './api-client';

export { API_BASE_URL, ApiError };

function normalizeAdminUser(user) {
  const departmentIds = user.departmentIds ?? [];
  return {
    ...user,
    fullName: user.profile?.fullName || user.profile?.displayFirstName || user.email,
    departmentIds,
    active: user.active ?? true,
  };
}

export const backendApi = {
  health: (signal) =>
    request('/actuator/health', { signal }),
  login: (email, password) =>
    request('/auth/login', { body: { email, password } }),
  passkeyAuthenticationOptions: () =>
    request('/auth/passkeys/authentication/options', { body: {} }),
  finishPasskeyAuthentication: (body) =>
    request('/auth/passkeys/authentication/verify', { body }),
  passkeyRegistrationOptions: (token, password) =>
    request('/auth/passkeys/registration/options', { token, body: { password } }),
  finishPasskeyRegistration: (token, body) =>
    request('/auth/passkeys/registration/verify', { token, body }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { body: { email } }),
  signup: (body) =>
    request('/auth/signup', { body }),
  createUser: (token, body) =>
    request('/admin/users', { token, body }).then(normalizeAdminUser),
  adminUsers: (token) =>
    request('/users?page=0&size=100', { token })
      .then((response) => response.items.map(normalizeAdminUser)),
  updateAdminUser: (token, id, body) =>
    request(`/users/${encodeURIComponent(id)}`, { token, method: 'PATCH', body })
      .then(normalizeAdminUser),
  setAdminUserActive: (token, id, active) =>
    request(`/users/${encodeURIComponent(id)}/${active ? 'reactivate' : 'deactivate'}`, {
      token,
      method: 'POST',
    }).then(normalizeAdminUser),
  adminRoles: (token) =>
    request('/roles', { token })
      .then((roles) => roles.map(({ role, staff }) => ({ id: role, name: role, staff }))),
  adminDepartments: (token) =>
    request('/departments', { token })
      .then((departments) => departments.map((department) => ({ ...department, active: true }))),
  createDepartment: (token, body) =>
    request('/departments', { token, body }),
  updateDepartment: (
    token,
    id,
    body,
  ) => request(`/departments/${encodeURIComponent(id)}`, { token, method: 'PUT', body }),
  dashboard: (token, signal) =>
    request('/dashboard/overview', { token, signal }),
  submissions: (
    token,
    options = {},
    signal,
  ) => {
    const query = new URLSearchParams({
      page: String(options.page ?? 0),
      size: String(options.size ?? 25),
    });
    if (options.q?.trim()) query.set('q', options.q.trim());
    if (options.category) query.set('category', options.category);
    if (options.stage) query.set('stage', options.stage);
    if (options.sector) query.set('sector', options.sector);
    return request(`/submissions?${query}`, { token, signal });
  },
  searchSubmissions: (token, code, page = 0, size = 25, signal) => {
    const query = new URLSearchParams({ code, page: String(page), size: String(size) });
    return request(`/submissions/search?${query}`, { token, signal });
  },
  mySubmissions: (token, page = 0, size = 25) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request(`/submissions/mine?${query}`, { token });
  },
  submitterSubmissions: (token, { page = 0, size = 25, tab } = {}, signal) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (tab) query.set('tab', tab);
    return request(`/me/submissions?${query}`, { token, signal });
  },
  submitterCapabilities: (token, signal) =>
    request('/me/capabilities', { token, signal }),
  createSubmission: (token, body) =>
    request('/submissions', { token, body }),
  submitSubmission: (token, id) =>
    request(`/submissions/${encodeURIComponent(id)}/submit`, { token, method: 'POST' }),
  submissionCaseFile: (token, id, signal) =>
    request(
      `/submissions/${encodeURIComponent(id)}`,
      { token, signal },
    ),
  caseFile: (token, id, signal) =>
    request(`/cases/${encodeURIComponent(id)}`, { token, signal }),
  caseCapabilities: (token, id, signal) =>
    request(`/cases/${encodeURIComponent(id)}/capabilities`, { token, signal }),
  allowedTransitions: (token, id, signal) =>
    request(
      `/cases/${encodeURIComponent(id)}/transitions/allowed`,
      { token, signal },
    ),
  completeFactFinding: (
    token,
    id,
    body,
  ) => request(`/cases/${encodeURIComponent(id)}/fact-finding/complete`, { token, body }),
  reviewQueue: (token, signal) =>
    request('/queues/reviews', { token, signal }),
  sectors: (token, signal) =>
    request('/sectors', { token, signal }),
  sectorCatalog: (token) =>
    request('/sectors/catalog', { token }),
  sectorFilterOptions: (token, signal) =>
    request('/sectors/filter-options', { token, signal }),
  createSector: (token, body) =>
    request('/sectors', { token, body }),
  updateSector: (
    token,
    id,
    body,
  ) => request(`/sectors/${encodeURIComponent(id)}`, { token, method: 'PUT', body }),
  sectorMembers: (token, id) =>
    request(`/sectors/${encodeURIComponent(id)}/members`, { token }),
  addSectorMember: (token, id, subject) =>
    request(`/sectors/${encodeURIComponent(id)}/members`, { token, body: { subject } }),
  removeSectorMember: (token, id, subject) => {
    const query = new URLSearchParams({ subject });
    return request(`/sectors/${encodeURIComponent(id)}/members?${query}`, {
      token,
      method: 'DELETE',
    });
  },
  receptionQueue: (token, page = 0, size = 25, signal) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request(`/queues/reception?${query}`, { token, signal });
  },
  register: (token, id) =>
    request(`/submissions/${encodeURIComponent(id)}/register`, { token, method: 'POST' }),
  forward: (token, id, sectorId) =>
    request(`/submissions/${encodeURIComponent(id)}/forward`, {
      token,
      body: { sectorId },
    }),
  advanceSubmission: (token, id, stage) =>
    request(`/submissions/${encodeURIComponent(id)}/transition`, {
      token,
      body: { stage },
    }),
  respondToRequest: (
    token,
    id,
    body,
  ) => request(`/submissions/${encodeURIComponent(id)}/reply`, { token, body }),
  assignReviewer: (token, id, subject) =>
    request(`/submissions/${encodeURIComponent(id)}/reviewer`, {
      token,
      method: 'PUT',
      body: { subject },
    }),
  addDocument: (
    token,
    id,
    body,
  ) => request(`/submissions/${encodeURIComponent(id)}/documents`, { token, body }),
  uploadDocument: (token, id, formData) =>
    request(`/submissions/${encodeURIComponent(id)}/documents/upload`, {
      token,
      body: formData,
    }),
  downloadDocument: (token, id, documentId) =>
    requestFile(
      `/submissions/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/file`,
      token,
    ),
  transition: (
    token,
    id,
    body,
  ) =>
    request(`/cases/${encodeURIComponent(id)}/transitions`, {
      token,
      body,
    }),
  saveOutcome: (
    token,
    id,
    body,
  ) => request(`/cases/${encodeURIComponent(id)}/outcome`, { token, method: 'PUT', body }),
  updateDocumentStatus: (
    token,
    id,
    documentId,
    body,
  ) => request(
    `/cases/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`,
    { token, method: 'PATCH', body },
  ),
};
