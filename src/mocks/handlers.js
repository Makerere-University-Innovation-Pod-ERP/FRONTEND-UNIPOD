import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { makeMockToken } from './jwt';
import { factFindingCases, factFindingQueue } from './fixtures/fact-finding';
import { reviewerAssigned, reviewerCases } from './fixtures/reviewer';
import { notifications } from './fixtures/notifications';
import { documentsBySubmission, sectors, submissions, toCaseFile } from './fixtures/submissions';
import { receptionHandlers, receptionMockUsers, registeredMockUsers } from './reception-handlers';
import { coordinatorHandlers, coordinatorMockUsers } from './coordinator-handlers';
import { initialMentorshipFollowUps, initialTrainingSessions } from './fixtures/training';
import { initialMediaRequests } from './fixtures/media';
import { initialPartners } from './fixtures/partners';
import { initialFinanceOverview } from './fixtures/overview';
import { initialInvoices, initialPriceList, initialInvoicesOverview } from './fixtures/invoices';
import { textileHandlers } from './textile-handlers';

const mockUsers = {
  'admin@unipod.test': { subject: 'Demo Administrator', roles: ['ROLE_ADMINISTRATOR'] },
  'factfinding@unipod.test': { subject: 'Joseph Lwanga', roles: ['ROLE_FACT_FINDING_OFFICER'] },
  'reviewer@unipod.test': { subject: 'Dr. Miriam Nsubuga', roles: ['ROLE_REVIEWER'] },
  'submitter@unipod.test': { subject: 'brian.s', roles: ['ROLE_SUBMITTER'] },
  'textile@unipod.test': { subject: 'Faith Nabwire', roles: ['ROLE_TEXTILE_DOMAIN_OWNER'] },
  ...coordinatorMockUsers,
  'finance@unipod.test': { subject: 'Daniel Kato', roles: ['ROLE_FINANCE_OFFICER'] },
  ...receptionMockUsers,
};

let trainingSessions = [...initialTrainingSessions];
let mentorshipFollowUps = [...initialMentorshipFollowUps];
let mediaRequests = [...initialMediaRequests];
let partners = [...initialPartners];
let invoices = [...initialInvoices];

// In-memory stores for admin/reception endpoints that aren't part of the
// submissions fixture — mock-only state, reset on page reload.
const sectorMembersStore = {};
const departments = [
  { id: 'dept-1', name: 'Innovation & Research', active: true, version: 1 },
  { id: 'dept-2', name: 'Finance & Administration', active: true, version: 1 },
  { id: 'dept-3', name: 'Textile Operations', active: true, version: 1 },
];
let adminUsers = [
  { id: 'staff-admin', fullName: 'Demo Administrator', email: 'admin@unipod.test', role: 'ADMINISTRATOR', departmentId: '', active: true, version: 1, createdAt: '2026-08-20' },
  { id: 'staff-1', fullName: 'Martha Akello', email: 'martha.akello@unipod.test', role: 'RECEPTIONIST', departmentId: 'dept-1', active: true, version: 1, createdAt: '2026-09-01' },
  { id: 'staff-2', fullName: 'Dr. Miriam Nsubuga', email: 'miriam.nsubuga@unipod.test', role: 'REVIEWER', departmentId: 'dept-1', active: true, version: 1, createdAt: '2026-09-04' },
  { id: 'staff-3', fullName: 'Daniel Kato', email: 'daniel.kato@unipod.test', role: 'FINANCE_OFFICER', departmentId: 'dept-2', active: true, version: 1, createdAt: '2026-09-10' },
  { id: 'staff-4', fullName: 'Grace Namuli', email: 'grace.namuli@unipod.test', role: 'DEPARTMENT_COORDINATOR', departmentId: 'dept-1', active: true, version: 1, createdAt: '2026-09-12' },
];
const adminPermissions = [
  { id: 'USERS_MANAGE', name: 'Manage user accounts', description: 'Create, update, and deactivate staff accounts.' },
  { id: 'ROLES_MANAGE', name: 'Manage roles and permissions', description: 'Configure role access to system capabilities.' },
  { id: 'DEPARTMENTS_MANAGE', name: 'Manage departments', description: 'Create and maintain departments.' },
  { id: 'SUBMISSIONS_VIEW', name: 'View submissions', description: 'View submitted innovation briefs.' },
  { id: 'SUBMISSIONS_REGISTER', name: 'Register submissions', description: 'Register and route submissions.' },
  { id: 'FACT_FINDING_MANAGE', name: 'Fact-finding', description: 'Perform fact-finding on assigned submissions.' },
  { id: 'REVIEWS_MANAGE', name: 'Review submissions', description: 'Review assigned submissions.' },
  { id: 'FINANCE_MANAGE', name: 'Manage finance', description: 'Access finance and invoice workflows.' },
];
let adminRoles = [
  { id: 'ADMINISTRATOR', name: 'Administrator', permissions: adminPermissions.map(({ id }) => id), version: 1, editable: false },
  { id: 'RECEPTIONIST', name: 'Receptionist', permissions: ['SUBMISSIONS_VIEW', 'SUBMISSIONS_REGISTER'], version: 1, editable: true },
  { id: 'FINANCE_OFFICER', name: 'Finance Officer', permissions: ['FINANCE_MANAGE'], version: 1, editable: true },
  { id: 'REVIEWER', name: 'Reviewer', permissions: ['SUBMISSIONS_VIEW', 'REVIEWS_MANAGE'], version: 1, editable: true },
  { id: 'DEPARTMENT_HEAD', name: 'Department Head', permissions: ['SUBMISSIONS_VIEW', 'FACT_FINDING_MANAGE'], version: 1, editable: true },
  { id: 'DEPARTMENT_COORDINATOR', name: 'Department Coordinator', permissions: ['SUBMISSIONS_VIEW', 'SUBMISSIONS_REGISTER'], version: 1, editable: true },
  { id: 'INNOVATION_COORDINATOR', name: 'Innovation Coordinator', permissions: ['SUBMISSIONS_VIEW', 'SUBMISSIONS_REGISTER', 'REVIEWS_MANAGE'], version: 1, editable: true },
  { id: 'FACT_FINDING_OFFICER', name: 'Fact-finding Officer', permissions: ['SUBMISSIONS_VIEW', 'FACT_FINDING_MANAGE'], version: 1, editable: true },
  { id: 'SECTOR_OFFICER', name: 'Sector Officer', permissions: ['SUBMISSIONS_VIEW', 'FACT_FINDING_MANAGE'], version: 1, editable: true },
  { id: 'IP_LIAISON', name: 'IP Liaison', permissions: ['SUBMISSIONS_VIEW'], version: 1, editable: true },
  { id: 'TEXTILE_DOMAIN_OWNER', name: 'Textile Domain Owner', permissions: [], version: 1, editable: true },
  { id: 'SUBMITTER', name: 'Submitter', permissions: [], version: 1, editable: true },
  { id: 'OBSERVER', name: 'Observer', permissions: ['SUBMISSIONS_VIEW'], version: 1, editable: true },
];

export const handlers = [
  http.get(`${API_BASE_URL}/actuator/health`, () => HttpResponse.json({ status: 'UP' })),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const account = (body.email && (mockUsers[body.email] ?? registeredMockUsers[body.email.toLowerCase()])) || mockUsers['factfinding@unipod.test'];
    return HttpResponse.json({
      tokenType: 'Bearer',
      accessToken: makeMockToken(account.roles, account.subject),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/dashboard/overview`, () => {
    const byStage = {};
    for (const item of submissions) byStage[item.stage] = (byStage[item.stage] ?? 0) + 1;
    const needsAttention = submissions
      .filter((item) => ['FACT_FINDING', 'REFINEMENT_REQUESTED', 'RECEIVED'].includes(item.stage))
      .map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        stage: item.stage,
        reason: item.stage === 'REFINEMENT_REQUESTED' ? 'Refinement requested' : item.stage === 'RECEIVED' ? 'Not yet in fact-finding' : 'Fact-finding in progress',
        updatedAt: item.updatedAt,
      }));
    return HttpResponse.json({
      totalSubmissions: submissions.length,
      byStage,
      studentSubmissions: submissions.filter((item) => item.category === 'student').length,
      generalSubmissions: submissions.filter((item) => item.category === 'general').length,
      awaitingActionCount: needsAttention.length,
      forwardedCount: submissions.filter((item) => item.stage === 'FORWARDED').length,
      completedCount: submissions.filter((item) => item.stage === 'COMPLETED').length,
      recentlyUpdatedCount: submissions.length,
      awaitingReviewCount: submissions.filter((item) => item.stage === 'UNDER_REVIEW').length,
      refinementRequestedCount: submissions.filter((item) => item.stage === 'REFINEMENT_REQUESTED').length,
      pipelineAtAGlance: byStage,
      needsAttention,
      operations: null,
      finance: null,
      recentActivity: null,
    });
  }),

  http.get(`${API_BASE_URL}/submissions`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() ?? '';
    const category = url.searchParams.get('category') ?? '';
    const stage = url.searchParams.get('stage') ?? '';
    const size = Number(url.searchParams.get('size') ?? 25);
    const page = Number(url.searchParams.get('page') ?? 0);
    const filtered = submissions.filter((item) =>
      (!q || `${item.title} ${item.code ?? ''}`.toLowerCase().includes(q)) &&
      (!category || item.category === category) &&
      (!stage || item.stage === stage),
    );
    const items = filtered.slice(page * size, page * size + size);
    return HttpResponse.json({
      items,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    });
  }),

  http.get(`${API_BASE_URL}/submissions/search`, ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code')?.trim() ?? '';
    const normalizedCode = code.toLowerCase();
    const exactMatches = submissions.filter((item) => item.code?.toLowerCase() === normalizedCode);
    const matchingItems = exactMatches.length
      ? exactMatches
      : submissions.filter((item) => item.title.toLowerCase().includes(normalizedCode));
    const size = Number(url.searchParams.get('size') ?? 25);
    const page = Number(url.searchParams.get('page') ?? 0);
    const items = matchingItems.slice(page * size, page * size + size);
    return HttpResponse.json({
      items,
      page,
      size,
      totalElements: matchingItems.length,
      totalPages: Math.max(1, Math.ceil(matchingItems.length / size)),
    });
  }),

  http.post(`${API_BASE_URL}/submissions`, async ({ request }) => {
    const body = await request.json();
    const now = new Date().toISOString().slice(0, 10);
    const created = {
      id: `IH-${String(Date.now()).slice(-5)}`,
      code: null,
      category: body.category ?? 'general',
      title: String(body.title ?? 'Untitled submission'),
      purpose: String(body.purpose ?? ''),
      problemAddressed: String(body.problemAddressed ?? ''),
      registeredBy: 'Mock account',
      submitterId: body.submitterId ?? null,
      receivingOfficer: null,
      assignedReviewerSubject: null,
      studentNumber: body.studentNumber ?? null,
      programme: body.programme ?? null,
      supervisor: body.supervisor ?? null,
      recommendationLetterStatus: body.recommendationLetterStatus ?? null,
      responsibleSectorId: null,
      responsibleSectorName: null,
      stage: 'DRAFT',
      receivedAt: null,
      forwardedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    submissions.unshift(created);
    return HttpResponse.json(created);
  }),

  http.get(`${API_BASE_URL}/sectors`, () => HttpResponse.json(sectors)),
  http.get(`${API_BASE_URL}/sectors/catalog`, () => HttpResponse.json(sectors)),
  http.get(`${API_BASE_URL}/sectors/filter-options`, () => HttpResponse.json(sectors)),

  http.post(`${API_BASE_URL}/sectors`, async ({ request }) => {
    const body = await request.json();
    const now = new Date().toISOString().slice(0, 10);
    const created = {
      id: `sec-${Date.now()}`,
      name: body.name,
      notificationEmail: body.notificationEmail ?? null,
      whatsapp: body.whatsapp ?? null,
      active: body.active ?? true,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    sectors.push(created);
    return HttpResponse.json(created);
  }),

  http.put(`${API_BASE_URL}/sectors/:id`, async ({ params, request }) => {
    const sector = sectors.find((candidate) => candidate.id === params.id);
    if (!sector) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    Object.assign(sector, body, { updatedAt: new Date().toISOString().slice(0, 10), version: sector.version + 1 });
    return HttpResponse.json(sector);
  }),

  http.get(`${API_BASE_URL}/sectors/:id/members`, ({ params }) => HttpResponse.json(sectorMembersStore[params.id] ?? [])),

  http.post(`${API_BASE_URL}/sectors/:id/members`, async ({ params, request }) => {
    const body = await request.json();
    const list = sectorMembersStore[params.id] ?? [];
    if (!list.includes(body.subject)) list.push(body.subject);
    sectorMembersStore[params.id] = list;
    return HttpResponse.json(list);
  }),

  http.delete(`${API_BASE_URL}/sectors/:id/members`, ({ params, request }) => {
    const url = new URL(request.url);
    const subject = url.searchParams.get('subject');
    sectorMembersStore[params.id] = (sectorMembersStore[params.id] ?? []).filter((item) => item !== subject);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE_URL}/admin/users`, () => HttpResponse.json(adminUsers)),

  http.post(`${API_BASE_URL}/admin/users`, async ({ request }) => {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!adminRoles.some((item) => item.id === body.role && item.id !== 'ADMINISTRATOR')) {
      return HttpResponse.json({ message: 'Select a valid non-administrator role.' }, { status: 400 });
    }
    if (body.departmentId && !departments.some((department) => department.id === body.departmentId && department.active)) {
      return HttpResponse.json({ message: 'Select an active department.' }, { status: 400 });
    }
    if (adminUsers.some((user) => user.email.toLowerCase() === email)) {
      return HttpResponse.json({ message: 'A staff account with this email already exists.' }, { status: 409 });
    }
    const createdAt = new Date().toISOString().slice(0, 10);
    const created = {
      id: `staff-${Date.now()}`,
      fullName: String(body.fullName ?? email.split('@')[0]),
      email,
      role: body.role,
      departmentId: body.departmentId ?? '',
      active: true,
      version: 1,
      createdAt,
    };
    adminUsers = [created, ...adminUsers];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/admin/users/:id`, async ({ params, request }) => {
    const user = adminUsers.find((candidate) => candidate.id === params.id);
    if (!user) return new HttpResponse(null, { status: 404 });
    if (user.role === 'ADMINISTRATOR') {
      return HttpResponse.json({ message: 'Administrator role assignments are protected.' }, { status: 409 });
    }
    const body = await request.json();
    if (!adminRoles.some((item) => item.id === body.role && item.id !== 'ADMINISTRATOR')) {
      return HttpResponse.json({ message: 'Select a valid non-administrator role.' }, { status: 400 });
    }
    if (body.departmentId && !departments.some((department) => department.id === body.departmentId && department.active)) {
      return HttpResponse.json({ message: 'Select an active department.' }, { status: 400 });
    }
    if (body.version !== user.version) {
      return HttpResponse.json({ message: 'This account changed elsewhere. Refresh and try again.' }, { status: 409 });
    }
    Object.assign(user, {
      role: body.role,
      departmentId: body.departmentId ?? '',
      version: user.version + 1,
    });
    return HttpResponse.json(user);
  }),

  http.patch(`${API_BASE_URL}/admin/users/:id/status`, async ({ params, request }) => {
    const user = adminUsers.find((candidate) => candidate.id === params.id);
    if (!user) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    if (body.version !== user.version) {
      return HttpResponse.json({ message: 'This account changed elsewhere. Refresh and try again.' }, { status: 409 });
    }
    if (user.role === 'ADMINISTRATOR' && !body.active
      && adminUsers.filter((candidate) => candidate.role === 'ADMINISTRATOR' && candidate.active).length <= 1) {
      return HttpResponse.json({ message: 'The last active administrator cannot be deactivated.' }, { status: 409 });
    }
    Object.assign(user, { active: Boolean(body.active), version: user.version + 1 });
    return HttpResponse.json(user);
  }),

  http.get(`${API_BASE_URL}/admin/departments`, () => HttpResponse.json(departments)),

  http.post(`${API_BASE_URL}/admin/departments`, async ({ request }) => {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (departments.some((department) => department.name.toLowerCase() === name.toLowerCase())) {
      return HttpResponse.json({ message: 'A department with this name already exists.' }, { status: 409 });
    }
    const created = { id: `dept-${Date.now()}`, name, active: body.active ?? true, version: 1 };
    departments.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/admin/departments/:id`, async ({ params, request }) => {
    const department = departments.find((candidate) => candidate.id === params.id);
    if (!department) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    if (body.version !== department.version) {
      return HttpResponse.json({ message: 'This department changed elsewhere. Refresh and try again.' }, { status: 409 });
    }
    Object.assign(department, {
      name: String(body.name ?? department.name).trim(),
      active: Boolean(body.active),
      version: department.version + 1,
    });
    return HttpResponse.json(department);
  }),

  http.get(`${API_BASE_URL}/admin/roles`, () => HttpResponse.json(adminRoles)),
  http.get(`${API_BASE_URL}/admin/permissions`, () => HttpResponse.json(adminPermissions)),

  http.put(`${API_BASE_URL}/admin/roles/:id/permissions`, async ({ params, request }) => {
    const role = adminRoles.find((candidate) => candidate.id === params.id);
    if (!role) return new HttpResponse(null, { status: 404 });
    if (!role.editable) {
      return HttpResponse.json({ message: 'The administrator role is protected.' }, { status: 409 });
    }
    const body = await request.json();
    if (body.version !== role.version) {
      return HttpResponse.json({ message: 'This role changed elsewhere. Refresh and try again.' }, { status: 409 });
    }
    const knownPermissions = new Set(adminPermissions.map(({ id }) => id));
    if (!Array.isArray(body.permissions) || body.permissions.some((id) => !knownPermissions.has(id))) {
      return HttpResponse.json({ message: 'One or more permissions are invalid.' }, { status: 400 });
    }
    Object.assign(role, { permissions: body.permissions, version: role.version + 1 });
    return HttpResponse.json(role);
  }),

  http.get(`${API_BASE_URL}/queues/reception`, ({ request }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get('size') ?? 25);
    const page = Number(url.searchParams.get('page') ?? 0);
    const queue = submissions.filter((item) => item.stage === 'RECEIVED');
    const items = queue.slice(page * size, page * size + size);
    return HttpResponse.json({ items, page, size, totalElements: queue.length, totalPages: Math.max(1, Math.ceil(queue.length / size)) });
  }),

  http.get(`${API_BASE_URL}/me/submissions`, ({ request }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get('size') ?? 25);
    const page = Number(url.searchParams.get('page') ?? 0);
    const mine = submissions.filter((item) => item.submitterId);
    const items = mine.slice(page * size, page * size + size);
    return HttpResponse.json({ items, page, size, totalElements: mine.length, totalPages: Math.max(1, Math.ceil(mine.length / size)) });
  }),

  http.get(`${API_BASE_URL}/me/capabilities`, () => HttpResponse.json({
    registrationMessage: 'Your account can submit and track briefs. Service requests, invoices, and bookings are not yet enabled for your account.',
    lockedModules: ['Service requests', 'Invoices and payments', 'Bookings'],
  })),

  http.get(`${API_BASE_URL}/submissions/:id`, ({ params }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(toCaseFile(item));
  }),

  http.post(`${API_BASE_URL}/submissions/:id/documents`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const document = {
      id: `doc-${params.id}-${Date.now()}`,
      submissionId: params.id,
      name: body.name,
      status: body.status ?? 'SUBMITTED',
      fileReference: body.fileReference ?? null,
      originalFilename: null,
      createdBy: 'Mock account',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    documentsBySubmission[params.id] = [...(documentsBySubmission[params.id] ?? []), document];
    return HttpResponse.json(document);
  }),

  http.post(`${API_BASE_URL}/submissions/:id/documents/upload`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const formData = await request.formData();
    const file = formData.get('file');
    const document = {
      id: `doc-${params.id}-${Date.now()}`,
      submissionId: params.id,
      name: formData.get('name') || (file instanceof File ? file.name : 'Uploaded file'),
      status: formData.get('status') ?? 'SUBMITTED',
      fileReference: null,
      originalFilename: file instanceof File ? file.name : null,
      createdBy: 'Mock account',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    documentsBySubmission[params.id] = [...(documentsBySubmission[params.id] ?? []), document];
    return HttpResponse.json(document);
  }),

  http.get(`${API_BASE_URL}/submissions/:id/documents/:documentId/file`, () =>
    new HttpResponse(new Blob(['Mock file — object storage is not configured in this environment.'], { type: 'text/plain' }), {
      headers: { 'Content-Type': 'text/plain' },
    }),
  ),

  http.put(`${API_BASE_URL}/submissions/:id/reviewer`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    item.assignedReviewerSubject = body.subject ?? null;
    item.version += 1;
    return HttpResponse.json(item);
  }),

  http.put(`${API_BASE_URL}/cases/:id/outcome`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    item.outcomeDecision = body.decision;
    item.outcomeNote = body.note;
    item.version += 1;
    return HttpResponse.json(toCaseFile(item));
  }),

  http.patch(`${API_BASE_URL}/cases/:id/documents/:documentId`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const list = documentsBySubmission[params.id] ?? [];
    const index = list.findIndex((document) => document.id === params.documentId);
    if (index >= 0) list[index] = { ...list[index], status: body.status };
    return HttpResponse.json(toCaseFile(item));
  }),

  http.get(`${API_BASE_URL}/cases/:id`, ({ params }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(toCaseFile(item));
  }),

  http.get(`${API_BASE_URL}/cases/:id/transitions/allowed`, ({ params }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ allowedTransitions: toCaseFile(item).transitionOptions.allowedTransitions });
  }),

  http.post(`${API_BASE_URL}/cases/:id/transitions`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    if (body.to_stage === 'REFINEMENT_REQUESTED') {
      item.previousVersionSnapshot = { title: item.title, purpose: item.purpose, problemAddressed: item.problemAddressed };
    }
    item.stage = body.to_stage;
    item.updatedAt = new Date().toISOString().slice(0, 10);
    item.version += 1;
    return HttpResponse.json(toCaseFile(item));
  }),

  http.post(`${API_BASE_URL}/submissions/:id/respond`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    item.title = body.title ?? item.title;
    item.purpose = body.purpose ?? item.purpose;
    item.problemAddressed = body.problemAddressed ?? item.problemAddressed;
    item.stage = 'UNDER_REVIEW';
    item.updatedAt = new Date().toISOString().slice(0, 10);
    item.version += 1;
    return HttpResponse.json(toCaseFile(item));
  }),

  http.post(`${API_BASE_URL}/submissions/:id/register`, ({ params }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.stage = 'RECEIVED';
    item.version += 1;
    return HttpResponse.json(item);
  }),

  http.post(`${API_BASE_URL}/submissions/:id/forward`, async ({ params, request }) => {
    const item = submissions.find((submission) => submission.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const sector = sectors.find((candidate) => candidate.id === body.sectorId);
    item.responsibleSectorId = body.sectorId;
    item.responsibleSectorName = sector?.name ?? null;
    item.stage = 'FORWARDED';
    item.forwardedAt = new Date().toISOString().slice(0, 10);
    item.version += 1;
    return HttpResponse.json(item);
  }),

  http.get(`${API_BASE_URL}/fact-finding/queue`, () => HttpResponse.json({ items: factFindingQueue })),

  http.get(`${API_BASE_URL}/fact-finding/cases/:id`, ({ params }) => {
    const item = factFindingCases[params.id];
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API_BASE_URL}/fact-finding/cases/:id/assessment`, async ({ params, request }) => {
    const id = params.id;
    const existing = factFindingCases[id];
    if (!existing) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const updated = {
      ...existing,
      checklist: body.checklist,
      assessment: body.assessment,
      updatedAt: new Date().toISOString().slice(0, 10),
      nextAction: { ...existing.nextAction, recommendation: body.nextAction || existing.nextAction.recommendation },
    };
    factFindingCases[id] = updated;
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE_URL}/reviewer/assigned`, () => HttpResponse.json({ items: reviewerAssigned })),

  http.get(`${API_BASE_URL}/reviewer/cases/:id`, ({ params }) => {
    const item = reviewerCases[params.id];
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API_BASE_URL}/reviewer/cases/:id/decision`, async ({ params, request }) => {
    const id = params.id;
    const existing = reviewerCases[id];
    if (!existing) return new HttpResponse(null, { status: 404 });
    if (existing.decisionStatus !== 'pending') {
      return HttpResponse.json({ message: 'A decision has already been submitted for this case and cannot be edited.' }, { status: 400 });
    }
    const body = await request.json();
    const updated = {
      ...existing,
      decisionStatus: body.decision,
      comment: body.comment,
      decidedAt: new Date().toISOString().slice(0, 10),
      pendingAction: body.decision === 'recommended' ? 'Decision recorded — no further action needed' : 'Decision recorded — awaiting coordinator follow-up',
    };
    reviewerCases[id] = updated;
    const assignedEntry = reviewerAssigned.find((entry) => entry.id === id);
    if (assignedEntry) {
      assignedEntry.decisionStatus = updated.decisionStatus;
      assignedEntry.pendingAction = updated.pendingAction;
    }
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE_URL}/notifications`, () => HttpResponse.json({ items: notifications })),

  http.post(`${API_BASE_URL}/notifications/read-all`, () => {
    for (const item of notifications) item.read = true;
    return new HttpResponse(null, { status: 204 });
  }),

  ...receptionHandlers,
  ...coordinatorHandlers,
  // Operations / Multimedia - Training & Mentorship
  http.get(`${API_BASE_URL}/operations/training/overview`, () => {
    const upcomingSessions = trainingSessions.filter((s) => s.status === 'Upcoming' || s.status === 'In Progress').length;
    const seatsFilled = trainingSessions.reduce((acc, s) => acc + s.enrolledCount, 0);
    const totalSeats = trainingSessions.reduce((acc, s) => acc + s.capacity, 0);
    const mentorshipFollowUpsCount = mentorshipFollowUps.length;

    return HttpResponse.json({
      upcomingSessions,
      seatsFilled,
      totalSeats,
      mentorshipFollowUps: mentorshipFollowUpsCount,
      sessions: trainingSessions,
      followUps: mentorshipFollowUps,
    });
  }),

  http.get(`${API_BASE_URL}/operations/training/sessions/:id`, ({ params }) => {
    const session = trainingSessions.find((s) => s.id === params.id);
    if (!session) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(session);
  }),

  http.post(`${API_BASE_URL}/operations/training/sessions/:sessionId/attendance`, async ({ params, request }) => {
    const { sessionId } = params;
    const { participantId, attendance } = await request.json();
    const sessionIndex = trainingSessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) return new HttpResponse(null, { status: 404 });

    const session = trainingSessions[sessionIndex];
    const updatedParticipants = session.participants.map((p) =>
      p.id === participantId ? { ...p, attendance } : p,
    );
    trainingSessions[sessionIndex] = { ...session, participants: updatedParticipants };
    return HttpResponse.json(trainingSessions[sessionIndex]);
  }),

  http.post(`${API_BASE_URL}/operations/training/sessions/:sessionId/registrations`, async ({ params, request }) => {
    const { sessionId } = params;
    const body = await request.json();
    const sessionIndex = trainingSessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) return new HttpResponse(null, { status: 404 });

    const newParticipant = {
      id: `p-${Date.now()}`,
      attendance: 'Unmarked',
      registeredAt: new Date().toISOString(),
      ...body,
    };
    const session = trainingSessions[sessionIndex];
    trainingSessions[sessionIndex] = {
      ...session,
      enrolledCount: session.enrolledCount + 1,
      participants: [...session.participants, newParticipant],
    };
    return HttpResponse.json(newParticipant);
  }),

  // Operations / Multimedia - Media Services
  http.get(`${API_BASE_URL}/operations/media/overview`, () => {
    return HttpResponse.json({
      requestedCount: mediaRequests.filter((r) => r.status === 'REQUESTED').length,
      scheduledCount: mediaRequests.filter((r) => r.status === 'SCHEDULED').length,
      inProductionCount: mediaRequests.filter((r) => r.status === 'IN_PRODUCTION').length,
      deliveredCount: mediaRequests.filter((r) => r.status === 'DELIVERED').length,
      requests: mediaRequests,
    });
  }),

  http.get(`${API_BASE_URL}/operations/media/requests`, () => {
    return HttpResponse.json(mediaRequests);
  }),

  http.patch(`${API_BASE_URL}/operations/media/requests/:id/status`, async ({ params, request }) => {
    const id = params.id;
    const body = await request.json();
    const index = mediaRequests.findIndex((r) => r.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    mediaRequests[index] = { ...mediaRequests[index], status: body.status };
    return HttpResponse.json(mediaRequests[index]);
  }),

  // Operations / Multimedia - Partners & MOUs
  http.get(`${API_BASE_URL}/operations/partners/overview`, () => {
    return HttpResponse.json({
      totalPartners: partners.length,
      renewalDueCount: partners.filter((p) => p.status === 'Renewal due' || p.status === 'Expiring soon').length,
      partners,
    });
  }),

  http.get(`${API_BASE_URL}/operations/partners`, () => {
    return HttpResponse.json(partners);
  }),

  http.post(`${API_BASE_URL}/operations/partners/:id/renew`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const index = partners.findIndex((p) => p.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });

    partners[index] = {
      ...partners[index],
      renewalDate: body.renewalDate || '12 Nov 2027',
      status: 'Active',
    };
    return HttpResponse.json(partners[index]);
  }),

  http.put(`${API_BASE_URL}/operations/partners/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const index = partners.findIndex((p) => p.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });

    partners[index] = { ...partners[index], ...body };
    return HttpResponse.json(partners[index]);
  }),

  // Finance / Overview (Daniel Kato, Finance Officer)
  http.get(`${API_BASE_URL}/finance/overview`, () => {
    return HttpResponse.json(initialFinanceOverview);
  }),

  // Finance / Price Lists & Invoices
  http.get(`${API_BASE_URL}/finance/invoices/overview`, () => {
    const awaitingCount = invoices.filter(
      (inv) => inv.status === 'Awaiting verification' || inv.status === 'Pending evidence',
    ).length;
    const receiptedCount = invoices.filter((inv) => inv.status === 'Receipted').length;

    return HttpResponse.json({
      ...initialInvoicesOverview,
      metrics: [
        {
          id: 'income',
          label: 'INCOME (MTD)',
          value: 'UGX 1.62M',
          variant: 'default',
          icon: 'Receipt',
        },
        {
          id: 'awaiting',
          label: 'AWAITING VERIFICATION',
          value: awaitingCount,
          variant: 'burgundy',
          icon: 'Clock',
        },
        {
          id: 'receipted',
          label: 'RECEIPTED',
          value: receiptedCount,
          variant: 'default',
          icon: 'CheckCircle',
        },
      ],
      priceList: initialPriceList,
      invoices,
    });
  }),

  http.post(`${API_BASE_URL}/finance/invoices/:id/verify`, ({ params }) => {
    const id = params.id;
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    invoices[index] = { ...invoices[index], status: 'Verified' };
    return HttpResponse.json(invoices[index]);
  }),

  http.post(`${API_BASE_URL}/finance/invoices/:id/receipt`, ({ params }) => {
    const id = params.id;
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    // Gating check: only verified invoices can release a receipt!
    if (invoices[index].status !== 'Verified') {
      return new HttpResponse(
        JSON.stringify({ message: 'Cannot release receipt: payment has not been verified.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const receiptNumber = `REC-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    invoices[index] = { ...invoices[index], status: 'Receipted', receiptNumber };
    return HttpResponse.json(invoices[index]);
  }),

  http.post(`${API_BASE_URL}/finance/invoices/:id/evidence`, async ({ params, request }) => {
    const id = params.id;
    const body = await request.json();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    invoices[index] = {
      ...invoices[index],
      status: 'Awaiting verification',
      paymentReference: body.paymentReference || 'BANK-REF-AUTOUPLOAD',
    };
    return HttpResponse.json(invoices[index]);
  }),
  ...textileHandlers,
];
