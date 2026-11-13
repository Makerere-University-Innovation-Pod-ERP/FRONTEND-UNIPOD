import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { makeMockToken } from './jwt';
import { factFindingCases, factFindingQueue } from './fixtures/fact-finding';
import { reviewerAssigned, reviewerCases } from './fixtures/reviewer';
import { notifications } from './fixtures/notifications';
import { documentsBySubmission, sectors, submissions, toCaseFile } from './fixtures/submissions';
import { textileHandlers } from './textile-handlers';

const mockUsers = {
  'factfinding@unipod.test': { subject: 'Joseph Lwanga', roles: ['ROLE_FACT_FINDING_OFFICER'] },
  'reviewer@unipod.test': { subject: 'Dr. Miriam Nsubuga', roles: ['ROLE_REVIEWER'] },
  'submitter@unipod.test': { subject: 'brian.s', roles: ['ROLE_SUBMITTER'] },
  'textile@unipod.test': { subject: 'Faith Nabwire', roles: ['ROLE_TEXTILE_DOMAIN_OWNER'] },
};

// In-memory stores for admin/reception endpoints that aren't part of the
// submissions fixture — mock-only state, reset on page reload.
const sectorMembersStore = {};

export const handlers = [
  http.get(`${API_BASE_URL}/actuator/health`, () => HttpResponse.json({ status: 'UP' })),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const account = (body.email && mockUsers[body.email]) || mockUsers['factfinding@unipod.test'];
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

  http.post(`${API_BASE_URL}/admin/users`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: `user-${Date.now()}`, email: body.email, role: body.role, createdAt: new Date().toISOString().slice(0, 10) });
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

  ...textileHandlers,
];
