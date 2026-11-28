import { API_BASE_URL, ApiError, request, requestFile } from './api-client';

export { API_BASE_URL, ApiError };

function normalizeAdminUser(user) {
  return {
    ...user,
    fullName: user.profile?.fullName || user.profile?.displayFirstName || user.email,
    departmentId: user.departmentId ?? '',
    active: user.active ?? true,
  };
}

function responseItems(response) {
  if (Array.isArray(response)) return response;
  return response?.items ?? response?.content ?? [];
}

async function loadAllAdminUsers(token) {
  const size = 100;
  const users = [];
  const seen = new Set();
  for (let page = 0; ; page += 1) {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await request(`/admin/users?${query}`, { token });
    const items = responseItems(response);
    if (!Array.isArray(items)) throw new TypeError('The admin users response must contain an array of users.');

    let added = 0;
    for (const user of items) {
      const key = user.id ?? user.email;
      if (key !== undefined && seen.has(key)) continue;
      if (key !== undefined) seen.add(key);
      users.push(normalizeAdminUser(user));
      added += 1;
    }

    const totalPages = Number(response?.totalPages ?? NaN);
    const totalElements = Number(response?.totalElements ?? NaN);
    if (
      Array.isArray(response) ||
      items.length === 0 ||
      added === 0 ||
      (Number.isFinite(totalPages) && totalPages > 0 && page + 1 >= totalPages) ||
      (Number.isFinite(totalElements) && totalElements >= 0 && users.length >= totalElements) ||
      (!Number.isFinite(totalPages) && !Number.isFinite(totalElements) && items.length < size)
    ) {
      return users;
    }
  }
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
  adminUsers: loadAllAdminUsers,
  updateAdminUser: (token, id, body) =>
    request(`/admin/users/${encodeURIComponent(id)}`, { token, method: 'PATCH', body })
      .then(normalizeAdminUser),
  setAdminUserActive: (token, id, active, version) =>
    request(`/admin/users/${encodeURIComponent(id)}/status`, {
      token,
      method: 'PATCH',
      body: { active, version },
    }).then(normalizeAdminUser),
  auditLogs: (token, options = {}, signal) => {
    const query = new URLSearchParams({
      page: String(options.page ?? 0),
      size: String(options.size ?? 25),
    });
    if (options.q?.trim()) query.set('q', options.q.trim());
    if (options.actor) query.set('actor', options.actor);
    if (options.action) query.set('action', options.action);
    if (options.outcome) query.set('outcome', options.outcome);
    if (options.from) query.set('from', options.from);
    if (options.to) query.set('to', options.to);
    return request(`/admin/audit-logs?${query}`, { token, signal });
  },
  adminRoles: (token) =>
    request('/admin/roles', { token })
      .then((response) => responseItems(response).map((item) => ({
        ...item,
        id: item.id ?? item.role,
        name: item.name ?? item.role,
      }))),
  adminPermissionRoles: (token) =>
    request('/admin/roles', { token }),
  adminPermissions: (token) =>
    request('/admin/permissions', { token }),
  updateRolePermissions: (token, id, body) =>
    request(`/admin/roles/${encodeURIComponent(id)}/permissions`, {
      token,
      method: 'PUT',
      body,
    }),
  adminDepartments: (token) =>
    request('/admin/departments', { token }).then(responseItems),
  createDepartment: (token, body) =>
    request('/admin/departments', { token, body }),
  updateDepartment: (
    token,
    id,
    body,
  ) => request(`/admin/departments/${encodeURIComponent(id)}`, { token, method: 'PUT', body }),
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
  updateSubmission: (
    token,
    id,
    body,
  ) => request(`/submissions/${encodeURIComponent(id)}`, { token, method: 'PUT', body }),
  submitSubmission: (token, id) =>
    request(`/submissions/${encodeURIComponent(id)}/submit`, { token, method: 'POST' }),
  submitterSubmissionDetail: (token, id, signal) =>
    request(`/me/submissions/${encodeURIComponent(id)}`, { token, signal }),
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
  submitReview: (
    token,
    id,
    body,
  ) => request(`/cases/${encodeURIComponent(id)}/reviews`, { token, body }),
  myReview: (token, id, signal) =>
    request(`/cases/${encodeURIComponent(id)}/my-review`, { token, signal }),
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
