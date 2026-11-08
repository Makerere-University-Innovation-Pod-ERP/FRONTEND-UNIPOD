import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import type { Submission } from '@/services/backend-api';
import { makeMockToken } from './jwt';
import { factFindingCases, factFindingQueue } from './fixtures/fact-finding';
import { reviewerAssigned, reviewerCases } from './fixtures/reviewer';
import { notifications } from './fixtures/notifications';
import { sectors, submissions, toCaseFile } from './fixtures/submissions';

const mockUsers: Record<string, { subject: string; roles: string[] }> = {
  'factfinding@unipod.test': { subject: 'Joseph Lwanga', roles: ['ROLE_FACT_FINDING_OFFICER'] },
  'reviewer@unipod.test': { subject: 'Dr. Miriam Nsubuga', roles: ['ROLE_REVIEWER'] },
};

export const handlers = [
  http.get(`${API_BASE_URL}/actuator/health`, () => HttpResponse.json({ status: 'UP' })),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    const account = (body.email && mockUsers[body.email]) || mockUsers['factfinding@unipod.test'];
    return HttpResponse.json({
      tokenType: 'Bearer',
      accessToken: makeMockToken(account.roles, account.subject),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/dashboard/overview`, () => {
    const byStage: Record<string, number> = {};
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

  http.post(`${API_BASE_URL}/submissions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString().slice(0, 10);
    const created: Submission = {
      id: `IH-${String(Date.now()).slice(-5)}`,
      code: null,
      category: (body.category as Submission['category']) ?? 'general',
      title: String(body.title ?? 'Untitled submission'),
      purpose: String(body.purpose ?? ''),
      problemAddressed: String(body.problemAddressed ?? ''),
      registeredBy: 'Mock account',
      submitterId: (body.submitterId as string) ?? null,
      receivingOfficer: null,
      assignedReviewerSubject: null,
      studentNumber: (body.studentNumber as string) ?? null,
      programme: (body.programme as string) ?? null,
      supervisor: (body.supervisor as string) ?? null,
      recommendationLetterStatus: (body.recommendationLetterStatus as string) ?? null,
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
    const body = (await request.json()) as { to_stage: string };
    item.stage = body.to_stage;
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
    const body = (await request.json()) as { sectorId: string };
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
    const item = factFindingCases[params.id as string];
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API_BASE_URL}/fact-finding/cases/:id/assessment`, async ({ params, request }) => {
    const id = params.id as string;
    const existing = factFindingCases[id];
    if (!existing) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { checklist: typeof existing.checklist; assessment: string; nextAction: string };
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
    const item = reviewerCases[params.id as string];
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.get(`${API_BASE_URL}/notifications`, () => HttpResponse.json({ items: notifications })),

  http.post(`${API_BASE_URL}/notifications/read-all`, () => {
    for (const item of notifications) item.read = true;
    return new HttpResponse(null, { status: 204 });
  }),
];
