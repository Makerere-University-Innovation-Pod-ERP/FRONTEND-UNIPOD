import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { makeMockToken } from './jwt';
import { factFindingCases, factFindingQueue } from './fixtures/fact-finding';
import { reviewerAssigned, reviewerCases } from './fixtures/reviewer';
import { notifications } from './fixtures/notifications';
import { sectors, submissions, toCaseFile } from './fixtures/submissions';
import { initialMentorshipFollowUps, initialTrainingSessions } from './fixtures/training';
import { initialMediaRequests } from './fixtures/media';
import { initialPartners } from './fixtures/partners';
import { initialFinanceOverview } from './fixtures/overview';
import { initialInvoices, initialPriceList, initialInvoicesOverview } from './fixtures/invoices';

const mockUsers = {
  'factfinding@unipod.test': { subject: 'Joseph Lwanga', roles: ['ROLE_FACT_FINDING_OFFICER'] },
  'reviewer@unipod.test': { subject: 'Dr. Miriam Nsubuga', roles: ['ROLE_REVIEWER'] },
  'coordinator@unipod.test': { subject: 'Grace Namuli', roles: ['ROLE_DEPARTMENT_COORDINATOR'] },
  'finance@unipod.test': { subject: 'Daniel Kato', roles: ['ROLE_FINANCE_OFFICER'] },
};

let trainingSessions = [...initialTrainingSessions];
let mentorshipFollowUps = [...initialMentorshipFollowUps];
let mediaRequests = [...initialMediaRequests];
let partners = [...initialPartners];
let invoices = [...initialInvoices];

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

  http.get(`${API_BASE_URL}/notifications`, () => HttpResponse.json({ items: notifications })),

  http.post(`${API_BASE_URL}/notifications/read-all`, () => {
    for (const item of notifications) item.read = true;
    return new HttpResponse(null, { status: 204 });
  }),

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
];
