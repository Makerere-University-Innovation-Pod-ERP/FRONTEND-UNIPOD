import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { makeMockToken } from './jwt';
import { factFindingCases, factFindingQueue } from './fixtures/fact-finding';
import { reviewerAssigned, reviewerCases } from './fixtures/reviewer';
import { notifications } from './fixtures/notifications';
import {
  documentsBySubmission,
  sectors,
  submissions,
  submitterServiceRequests,
  toCaseFile,
} from './fixtures/submissions';
import { receptionHandlers, receptionMockUsers, registeredMockUsers } from './reception-handlers';
import { coordinatorHandlers, coordinatorMockUsers } from './coordinator-handlers';
import { initialMentorshipFollowUps, initialTrainingSessions, trainingDepartments } from './fixtures/training';
import { initialMediaRequests } from './fixtures/media';
import { initialEquipment } from './fixtures/equipment';
import {
  initialBookings,
  initialFacilities,
  initialSubmitterBookings,
  initialTimetableBlocks,
} from './fixtures/bookings';
import { initialCncJobs, initialCncPrices } from './fixtures/cnc';
import { initialContracts } from './fixtures/contracts';
import { initialRules } from './fixtures/rules';
import { initialPartners } from './fixtures/partners';
import { initialFinanceOverview } from './fixtures/overview';
import {
  initialInvoices,
  initialPriceList,
  initialInvoicesOverview,
  initialSubmitterInvoices,
} from './fixtures/invoices';
import { textileHandlers } from './textile-handlers';
import { telecomsHandlers } from './telecoms-handlers';
import { cncStockHandlers } from './cnc-handlers';

const mockUsers = {
  'admin@unipod.test': { subject: 'Demo Administrator', roles: ['ROLE_ADMINISTRATOR'] },
  'factfinding@unipod.test': { subject: 'Joseph Lwanga', roles: ['ROLE_FACT_FINDING_OFFICER'] },
  'reviewer@unipod.test': { subject: 'Dr. Miriam Nsubuga', roles: ['ROLE_REVIEWER'] },
  'submitter@unipod.test': { subject: 'brian.s', roles: ['ROLE_SUBMITTER'] },
  'textile@unipod.test': { subject: 'Faith Nabwire', roles: ['ROLE_TEXTILE_DOMAIN_OWNER'] },
  ...coordinatorMockUsers,
  'finance@unipod.test': { subject: 'Daniel Kato', roles: ['ROLE_FINANCE_OFFICER'] },
  'multimedia@unipod.test': { subject: 'Nkuru', roles: ['ROLE_MULTIMEDIA_OFFICER'] },
  'cnc@unipod.test': { subject: 'Robinson', roles: ['ROLE_CNC_DOMAIN_OWNER'] },
  'telecoms@unipod.test': { subject: 'Eng. Kaddu', roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
  'telecom@unipod.test': { subject: 'Eng. Kaddu', roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
  'kaddu@unipod.test': { subject: 'Eng. Kaddu', roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
  'eng.kaddu@unipod.test': { subject: 'Eng. Kaddu', roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
  'telecoms': { subject: 'Eng. Kaddu', roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
  'telecom': { subject: 'Eng. Kaddu', roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
  ...receptionMockUsers,
};

let trainingSessions = [...initialTrainingSessions];
let mentorshipFollowUps = [...initialMentorshipFollowUps];

function trainingProblem(status, detail) {
  return HttpResponse.json({ status, detail }, { status });
}

function updateTrainingSession(sessionId, change, okStatus = 200) {
  const index = trainingSessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return trainingProblem(404, 'Training session not found.');
  const result = change(trainingSessions[index]);
  if (result.error) return trainingProblem(409, result.error);
  const participants = result.participants ?? trainingSessions[index].participants;
  const updated = {
    ...trainingSessions[index],
    participants,
    enrolledCount: participants.filter((p) => p.status !== 'CANCELLED').length,
  };
  trainingSessions = trainingSessions.map((s, i) => (i === index ? updated : s));
  return HttpResponse.json(updated, { status: okStatus });
}

function updateTrainingParticipant(sessionId, participantId, change) {
  return updateTrainingSession(sessionId, (session) => {
    const target = session.participants.find((p) => p.id === participantId);
    if (!target) return { error: 'Participant not found.' };
    const result = change(target, session);
    if (result.error) return result;
    return { participants: session.participants.map((p) => (p.id === participantId ? result : p)) };
  });
}
let mediaRequests = [...initialMediaRequests];
let multimediaEquipment = [...initialEquipment];
let facilities = [...initialFacilities];
let cncJobs = [...initialCncJobs];
const CNC_STAGES = ['NEW', 'QUOTED', 'PAYMENT_GATE', 'SCHEDULED', 'IN_PRODUCTION', 'READY', 'COLLECTED'];
let bookings = [...initialBookings];
const timetableBlocks = [...initialTimetableBlocks];
const BLOCKING = ['PENDING', 'APPROVED', 'CHECKED_IN', 'OUT'];

function overlaps(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}

function bookingProblem(status, detail) {
  return HttpResponse.json({ status, detail }, { status });
}

function updateBooking(id, change) {
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return bookingProblem(404, 'Booking not found.');
  const previous = bookings[index];
  const result = change(previous);
  if (result.error) return bookingProblem(...result.error);
  const updated = { ...result, decidedAt: result.decidedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
  bookings = bookings.map((b, i) => (i === index ? updated : b));
  const statusNotifications = {
    APPROVED: ['BOOKING_APPROVED', `Booking approved: ${updated.reference}`, `Your booking for ${updated.facilityName} has been approved.`],
    REJECTED: ['BOOKING_REJECTED', `Booking rejected: ${updated.reference}`, `Your booking for ${updated.facilityName} was rejected.`],
  };
  const notification = statusNotifications[updated.status];
  if (updated.status !== previous.status && notification) {
    publishMockNotification(updated, ...notification);
  }
  return HttpResponse.json(updated);
}

function publishMockNotification(booking, type, title, body) {
  notificationRecords.unshift({
    id: `00000000-0000-4000-8000-${String(nextNotificationNumber++).padStart(12, '0')}`,
    type,
    title,
    body,
    entityType: 'booking',
    entityId: booking.id,
    createdAt: new Date().toISOString(),
    readAt: null,
    read: false,
    recipient: booking.requesterId?.toLocaleLowerCase(),
  });
}

function notificationsForRequest(request) {
  const email = mockSubmitterEmail(request);
  return notificationRecords.filter((item) => !item.recipient || item.recipient === email);
}
let eventContracts = [...initialContracts];
let rules = [...initialRules];
let partners = [...initialPartners];
let invoices = [...initialInvoices];
let notificationRecords = notifications.map((item) => ({ ...item }));
let nextNotificationNumber = 704;
let pushSubscriptions = new Map();
const createSubmitterInvoiceMocks = () => initialSubmitterInvoices.map((invoice) => ({
  ...invoice,
  paymentProof: invoice.paymentProof ? { ...invoice.paymentProof } : null,
  receipt: invoice.receipt ? { ...invoice.receipt } : null,
}));
let submitterInvoices = createSubmitterInvoiceMocks();
const createSubmitterBookingMocks = () => initialSubmitterBookings.map((booking) => ({ ...booking }));
let submitterBookings = createSubmitterBookingMocks();
let nextSubmitterBookingNumber = 1202;

export function resetSubmitterInvoiceMocks() {
  submitterInvoices = createSubmitterInvoiceMocks();
}

export function resetSubmitterBookingMocks() {
  submitterBookings = createSubmitterBookingMocks();
  nextSubmitterBookingNumber = 1202;
}

export function resetNotificationMocks() {
  notificationRecords = notifications.map((item) => ({ ...item }));
  nextNotificationNumber = 704;
  pushSubscriptions = new Map();
}

function mockSubmitterEmail(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const encodedPayload = token?.split('.')[1];
  if (!encodedPayload) return null;
  try {
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.roles?.includes('ROLE_SUBMITTER') && typeof payload.email === 'string'
      ? payload.email.toLocaleLowerCase()
      : null;
  } catch {
    return null;
  }
}

function findSubmitterInvoice(request, id) {
  const email = mockSubmitterEmail(request);
  if (!email) return { status: 401, invoice: null };
  const invoice = submitterInvoices.find((item) => (
    item.id === id && item.customerEmail.toLocaleLowerCase() === email
  ));
  return { status: invoice ? 200 : 404, invoice: invoice ?? null };
}

function findSubmitterBooking(request, id) {
  const email = mockSubmitterEmail(request);
  if (!email) return { status: 401, booking: null };
  const booking = submitterBookings.find((item) => (
    item.id === id && item.requesterId.toLocaleLowerCase() === email
  ));
  return { status: booking ? 200 : 404, booking: booking ?? null };
}

const invoiceStatusMap = {
  'Pending evidence': 'WAITING_FOR_PROOF',
  'Awaiting verification': 'WAITING_FOR_CHECK',
  Verified: 'PAID',
  Receipted: 'RECEIPTED',
};

const toApiInvoice = (invoice) => {
  const rawAmount = invoice.amountNumeric ?? Number(String(invoice.amount ?? '0').replace(/[^\d]/g, ''));
  const amountNumeric = Number(rawAmount || 0);
  const normalizedStatus = invoiceStatusMap[invoice.status] || 'WAITING_FOR_PROOF';
  const receipt = invoice.receiptNumber
    ? {
        id: `receipt-${invoice.id}`,
        invoiceId: invoice.id,
        receiptNumber: invoice.receiptNumber,
        issuedBy: 'Daniel Kato',
        issuedAt: new Date().toISOString(),
      }
    : null;

  return {
    id: invoice.id,
    number: invoice.invoiceNumber,
    customerEmail: invoice.client ? `${invoice.client.toLowerCase().replace(/\s+/g, '.')}@demo.test` : 'finance@unipod.test',
    customerName: invoice.client || 'Client',
    department: null,
    description: invoice.title,
    amount: amountNumeric,
    currency: 'UGX',
    sourceType: 'REQUEST',
    sourceId: null,
    status: normalizedStatus,
    statusLabel: invoice.status,
    issuedBy: 'Daniel Kato',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    paymentProof: invoice.paymentReference
      ? {
          id: `proof-${invoice.id}`,
          reference: invoice.paymentReference,
          amount: amountNumeric,
          paidOn: new Date().toISOString().slice(0, 10),
          contentType: 'application/octet-stream',
          fileSize: 1024,
          originalFilename: 'payment-proof.txt',
          status: invoice.paymentProofStatus || (invoice.status === 'Verified' || invoice.status === 'Receipted' ? 'VERIFIED' : 'PENDING'),
          rejectionReason: invoice.rejectionReason || null,
          uploadedBy: 'submitter@unipod.test',
          uploadedAt: new Date().toISOString(),
          verifiedBy: invoice.status === 'Verified' || invoice.status === 'Receipted' ? 'Daniel Kato' : null,
          verifiedAt: invoice.status === 'Verified' || invoice.status === 'Receipted' ? new Date().toISOString() : null,
        }
      : null,
    receipt,
  };
};

// In-memory stores for admin/reception endpoints that aren't part of the
// submissions fixture — mock-only state, reset on page reload.
const sectorMembersStore = {};
const departments = [
  { id: 'dept-1', name: 'Innovation & Research', notificationEmail: 'innovation@example.test', active: true, version: 1 },
  { id: 'dept-2', name: 'Finance & Administration', notificationEmail: 'finance@example.test', active: true, version: 1 },
  { id: 'dept-3', name: 'Textile Operations', notificationEmail: 'textile@example.test', active: true, version: 1 },
];
let adminUsers = [
  { id: 'staff-admin', fullName: 'Demo Administrator', email: 'admin@unipod.test', role: 'ADMINISTRATOR', departmentId: '', active: true, version: 1, createdAt: '2026-08-20' },
  { id: 'staff-1', fullName: 'Martha Akello', email: 'martha.akello@unipod.test', role: 'RECEPTIONIST', departmentId: 'dept-1', active: true, version: 1, createdAt: '2026-09-01' },
  { id: 'staff-2', fullName: 'Dr. Miriam Nsubuga', email: 'miriam.nsubuga@unipod.test', role: 'REVIEWER', departmentId: 'dept-1', active: true, version: 1, createdAt: '2026-09-04' },
  { id: 'staff-3', fullName: 'Daniel Kato', email: 'daniel.kato@unipod.test', role: 'FINANCE_OFFICER', departmentId: 'dept-2', active: true, version: 1, createdAt: '2026-09-10' },
  { id: 'staff-4', fullName: 'Grace Namuli', email: 'grace.namuli@unipod.test', role: 'DEPARTMENT_COORDINATOR', departmentId: 'dept-1', active: true, version: 1, createdAt: '2026-09-12' },
];
const adminPermissions = [
  { id: 'CASE_VIEW', name: 'View submissions', description: "View submissions within the role's assigned scope." },
  { id: 'CASE_EDIT', name: 'Edit submissions', description: "Edit submissions within the role's assigned scope." },
  { id: 'CASE_FORWARD', name: 'Route submissions', description: 'Forward submissions to the next workflow stage.' },
  { id: 'CASE_ASSIGN_REVIEWER', name: 'Assign reviewers', description: 'Assign reviewers to submissions.' },
  { id: 'CASE_REVIEW', name: 'Review submissions', description: 'Submit reviews for assigned submissions.' },
  { id: 'CASE_DECIDE', name: 'Decide submissions', description: 'Make workflow decisions on submissions.' },
  { id: 'AUDIT_VIEW', name: 'View audit log', description: 'View recorded system activity.' },
  { id: 'USER_MANAGE', name: 'Manage user accounts', description: 'Create and manage user accounts.' },
  { id: 'PRICE_LIST_MANAGE', name: 'Manage finance', description: 'Manage price lists and finance operations.' },
  { id: 'PRICE_LIST_PROPOSE', name: 'Propose price list updates', description: 'Propose price-list updates within the assigned scope.' },
  { id: 'REPORT_VIEW', name: 'View reports', description: 'View system reports.' },
];
let adminRoles = [
  { id: 'ADMINISTRATOR', name: 'Administrator', permissions: adminPermissions.map(({ id }) => id), version: 1, editable: false },
  { id: 'RECEPTIONIST', name: 'Receptionist', permissions: ['CASE_VIEW', 'CASE_EDIT', 'CASE_FORWARD'], version: 1, editable: true },
  { id: 'FINANCE_OFFICER', name: 'Finance Officer', permissions: ['PRICE_LIST_MANAGE'], version: 1, editable: true },
  { id: 'REVIEWER', name: 'Reviewer', permissions: ['CASE_VIEW', 'CASE_REVIEW'], version: 1, editable: true },
  { id: 'DEPARTMENT_COORDINATOR', name: 'Department Coordinator', permissions: ['CASE_VIEW', 'PRICE_LIST_PROPOSE'], version: 1, editable: true },
  { id: 'INNOVATION_COORDINATOR', name: 'Innovation Coordinator', permissions: ['CASE_VIEW', 'CASE_EDIT', 'CASE_ASSIGN_REVIEWER', 'CASE_DECIDE', 'AUDIT_VIEW', 'REPORT_VIEW'], version: 1, editable: true },
  { id: 'FACT_FINDING_OFFICER', name: 'Fact-finding Officer', permissions: ['CASE_VIEW', 'CASE_EDIT'], version: 1, editable: true },
  { id: 'SECTOR_OFFICER', name: 'Sector Officer', permissions: ['CASE_VIEW'], version: 1, editable: true },
  { id: 'IP_LIAISON', name: 'IP Liaison', permissions: [], version: 1, editable: true },
  { id: 'SUBMITTER', name: 'Submitter', permissions: [], version: 1, editable: true },
  { id: 'OBSERVER', name: 'Observer', permissions: ['CASE_VIEW', 'AUDIT_VIEW', 'REPORT_VIEW'], version: 1, editable: true },
  { id: 'TELECOMS_DOMAIN_OWNER', name: 'Telecoms Domain Owner', permissions: [], version: 1, editable: true },
  { id: 'staff-admin', email: 'admin@unipod.test', role: 'ADMINISTRATOR', departmentIds: [], profile: { fullName: 'Demo Administrator' }, active: true, createdAt: '2026-08-20' },
  { id: 'staff-1', email: 'martha.akello@unipod.test', role: 'RECEPTIONIST', departmentIds: ['dept-1'], profile: { fullName: 'Martha Akello' }, active: true, createdAt: '2026-09-01' },
  { id: 'staff-2', email: 'miriam.nsubuga@unipod.test', role: 'REVIEWER', departmentIds: ['dept-1'], profile: { fullName: 'Dr. Miriam Nsubuga' }, active: true, createdAt: '2026-09-04' },
  { id: 'staff-3', email: 'daniel.kato@unipod.test', role: 'FINANCE_OFFICER', departmentIds: ['dept-2'], profile: { fullName: 'Daniel Kato' }, active: true, createdAt: '2026-09-10' },
  { id: 'staff-4', email: 'grace.namuli@unipod.test', role: 'DEPARTMENT_COORDINATOR', departmentIds: ['dept-1'], profile: { fullName: 'Grace Namuli' }, active: true, createdAt: '2026-09-12' },
];
const adminRoles = [
  { role: 'ADMINISTRATOR', staff: true },
  { role: 'INNOVATION_COORDINATOR', staff: true },
  { role: 'DEPARTMENT_COORDINATOR', staff: true },
  { role: 'RECEPTIONIST', staff: true },
  { role: 'FACT_FINDING_OFFICER', staff: true },
  { role: 'REVIEWER', staff: true },
  { role: 'SECTOR_OFFICER', staff: true },
  { role: 'IP_LIAISON', staff: true },
  { role: 'SUBMITTER', staff: false },
  { role: 'FINANCE_OFFICER', staff: true },
  { role: 'OBSERVER', staff: true },
];

export const handlers = [
  http.get(`${API_BASE_URL}/actuator/health`, () => HttpResponse.json({ status: 'UP' })),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const rawEmail = (body.email || '').trim().toLowerCase();
    const account = (rawEmail && (mockUsers[rawEmail] ?? registeredMockUsers[rawEmail]))
      || mockUsers['telecoms@unipod.test']
      || mockUsers['factfinding@unipod.test'];
    return HttpResponse.json({
      tokenType: 'Bearer',
      accessToken: makeMockToken(account.roles, account.subject, rawEmail),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/auth/forgot-password`, () => new HttpResponse(null, { status: 202 })),

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
      acceptedRules: Array.isArray(body.acceptedRules) ? body.acceptedRules : [],
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

  http.get(`${API_BASE_URL}/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 25);
    const items = adminUsers.slice(page * size, page * size + size);
    return HttpResponse.json({
      items,
      page,
      size,
      totalElements: adminUsers.length,
      totalPages: Math.ceil(adminUsers.length / size),
    });
  }),

  http.post(`${API_BASE_URL}/admin/users`, async ({ request }) => {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!adminRoles.some((item) => item.role === body.role && item.role !== 'ADMINISTRATOR')) {
      return HttpResponse.json({ message: 'Select a valid non-administrator role.' }, { status: 400 });
    }
    if (adminUsers.some((user) => user.email.toLowerCase() === email)) {
      return HttpResponse.json({ message: 'A staff account with this email already exists.' }, { status: 409 });
    }
    const created = {
      id: `staff-${Date.now()}`,
      email,
      role: body.role,
      departmentIds: [],
      profile: null,
      active: true,
      createdAt: new Date().toISOString(),
    };
    adminUsers = [created, ...adminUsers];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/users/:id`, async ({ params, request }) => {
    const user = adminUsers.find((candidate) => candidate.id === params.id);
    if (!user) return new HttpResponse(null, { status: 404 });
    if (user.role === 'ADMINISTRATOR') {
      return HttpResponse.json({ message: 'Administrator role assignments are protected.' }, { status: 409 });
    }
    const body = await request.json();
    if (!adminRoles.some((item) => item.role === body.role && item.role !== 'ADMINISTRATOR')) {
      return HttpResponse.json({ message: 'Select a valid non-administrator role.' }, { status: 400 });
    }
    if (!Array.isArray(body.departmentIds)
      || body.departmentIds.some((id) => !departments.some((department) => department.id === id && department.active))) {
      return HttpResponse.json({ message: 'Select an active department.' }, { status: 400 });
    }
    Object.assign(user, {
      role: body.role,
      departmentIds: body.departmentIds,
    });
    return HttpResponse.json(user);
  }),

  http.post(`${API_BASE_URL}/users/:id/deactivate`, ({ params }) => {
    const user = adminUsers.find((candidate) => candidate.id === params.id);
    if (!user) return new HttpResponse(null, { status: 404 });
    if (user.role === 'ADMINISTRATOR'
      && adminUsers.filter((candidate) => candidate.role === 'ADMINISTRATOR' && candidate.active).length <= 1) {
      return HttpResponse.json({ message: 'The last active administrator cannot be deactivated.' }, { status: 409 });
    }
    user.active = false;
    return HttpResponse.json(user);
  }),

  http.get(`${API_BASE_URL}/admin/departments`, () => HttpResponse.json(departments)),

  http.post(`${API_BASE_URL}/admin/departments`, async ({ request }) => {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (departments.some((department) => department.name.toLowerCase() === name.toLowerCase())) {
      return HttpResponse.json({ message: 'A department with this name already exists.' }, { status: 409 });
    }
    const created = {
      id: `dept-${Date.now()}`,
      name,
      notificationEmail: String(body.notificationEmail ?? '').trim(),
      active: body.active ?? true,
      version: 1,
    };
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
      notificationEmail: String(body.notificationEmail ?? department.notificationEmail).trim(),
      active: Boolean(body.active),
      version: department.version + 1,
    });
    return HttpResponse.json(department);
  http.post(`${API_BASE_URL}/users/:id/reactivate`, ({ params }) => {
    const user = adminUsers.find((candidate) => candidate.id === params.id);
    if (!user) return new HttpResponse(null, { status: 404 });
    user.active = true;
    return HttpResponse.json(user);
  }),

  http.get(`${API_BASE_URL}/departments`, () => HttpResponse.json(
    departments.filter((department) => department.active).map(({ id, name }) => ({ id, name })),
  )),

  http.get(`${API_BASE_URL}/roles`, () => HttpResponse.json(adminRoles)),

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
    const mine = url.searchParams.get('tab') === 'SERVICE_REQUESTS'
      ? submitterServiceRequests
      : submissions.filter((item) => item.submitterId);
    const items = mine.slice(page * size, page * size + size);
    return HttpResponse.json({ items, page, size, totalElements: mine.length, totalPages: Math.max(1, Math.ceil(mine.length / size)) });
  }),

  http.get(`${API_BASE_URL}/me/capabilities`, () => HttpResponse.json({
    canCreateBrief: true,
    canEditDraft: true,
    canSubmitDraft: true,
    canRespondToInformationRequest: true,
    canUploadDocuments: true,
    canUploadPaymentProof: true,
    canBook: true,
    modules: [
      { key: 'BRIEFS', label: 'Briefs', availability: 'AVAILABLE', reason: null },
      { key: 'SERVICE_REQUESTS', label: 'Service requests', availability: 'AVAILABLE', reason: null },
      { key: 'INVOICES', label: 'Invoices and payments', availability: 'AVAILABLE', reason: null },
      { key: 'BOOKINGS', label: 'Bookings', availability: 'AVAILABLE', reason: null },
    ],
    message: 'Your account can create and edit your own drafts, submit them to reception, respond to information requests, upload documents, upload payment proof, view receipts, and request facility bookings.',
  })),

  http.get(`${API_BASE_URL}/submissions/:id`, ({ params }) => {
    const item = submissions.find((submission) => submission.id === params.id)
      ?? submitterServiceRequests.find((submission) => submission.id === params.id);
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

  http.get(`${API_BASE_URL}/notifications`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? 0);
    const size = Number(params.get('size') ?? 25);
    const unreadOnly = params.get('unread') === 'true';
    const all = notificationsForRequest(request);
    const filtered = unreadOnly ? all.filter((item) => !item.read) : all;
    const items = filtered.slice(page * size, (page + 1) * size);
    return HttpResponse.json({
      items,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    });
  }),

  http.get(`${API_BASE_URL}/notifications/unread-count`, ({ request }) => (
    HttpResponse.json({ unread: notificationsForRequest(request).filter((item) => !item.read).length })
  )),

  http.get(`${API_BASE_URL}/notifications/push/config`, () => (
    HttpResponse.json({ enabled: true, publicKey: 'B'.repeat(87) })
  )),

  http.put(`${API_BASE_URL}/notifications/push/subscriptions`, async ({ request }) => {
    const body = await request.json();
    const email = mockSubmitterEmail(request);
    if (!email) return new HttpResponse(null, { status: 401 });
    pushSubscriptions.set(`${email}:${body.endpoint}`, body);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${API_BASE_URL}/notifications/push/subscriptions`, ({ request }) => {
    const email = mockSubmitterEmail(request);
    if (!email) return new HttpResponse(null, { status: 401 });
    pushSubscriptions.delete(`${email}:${new URL(request.url).searchParams.get('endpoint')}`);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/notifications/:id/read`, ({ params, request }) => {
    const notification = notificationsForRequest(request).find((item) => item.id === params.id);
    if (!notification) return new HttpResponse(null, { status: 404 });
    const updated = { ...notification, read: true, readAt: notification.readAt ?? new Date().toISOString() };
    notificationRecords = notificationRecords.map((item) => item.id === params.id ? updated : item);
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/notifications/read-all`, ({ request }) => {
    const current = notificationsForRequest(request);
    const unreadIds = new Set(current.filter((item) => !item.read).map((item) => item.id));
    const readAt = new Date().toISOString();
    notificationRecords = notificationRecords.map((item) => unreadIds.has(item.id)
      ? { ...item, read: true, readAt }
      : item);
    return HttpResponse.json({ marked: unreadIds.size });
  }),

  ...receptionHandlers,
  ...coordinatorHandlers,
  // Operations / Multimedia - Training & Mentorship
  http.get(`${API_BASE_URL}/departments`, () => HttpResponse.json(trainingDepartments)),

  http.get(`${API_BASE_URL}/operations/training/overview`, () => {
    const live = trainingSessions.filter((s) => s.status === 'UPCOMING' || s.status === 'IN_PROGRESS');
    return HttpResponse.json({
      upcomingSessions: live.length,
      seatsFilled: trainingSessions.reduce((acc, s) => acc + s.enrolledCount, 0),
      totalSeats: trainingSessions.reduce((acc, s) => acc + s.capacity, 0),
      mentorshipFollowUps: mentorshipFollowUps.length,
      sessions: trainingSessions,
      followUps: mentorshipFollowUps,
    });
  }),

  http.get(`${API_BASE_URL}/operations/training/sessions/:id`, ({ params }) => {
    const session = trainingSessions.find((s) => s.id === params.id);
    return session ? HttpResponse.json(session) : trainingProblem(404, 'Training session not found.');
  }),

  http.post(`${API_BASE_URL}/operations/training/sessions`, async ({ request }) => {
    const body = await request.json();
    if (!body.departmentId || !body.date || !(body.capacity >= 1)) {
      return trainingProblem(400, 'The session request is invalid.');
    }
    const starts = new Date(body.date);
    const newSession = {
      id: `ts-${Date.now()}`,
      title: body.title,
      facilitator: body.facilitator,
      date: body.date,
      endsAt: body.endsAt ?? new Date(starts.getTime() + 2 * 3600_000).toISOString(),
      enrolledCount: 0,
      capacity: body.capacity,
      venue: body.venue,
      status: body.publish === false ? 'DRAFT' : 'UPCOMING',
      description: body.description ?? null,
      participants: [],
      departmentId: body.departmentId,
      fee: body.fee ?? 0,
      safetyCourse: Boolean(body.safetyCourse),
      published: body.publish !== false,
    };
    trainingSessions = [...trainingSessions, newSession];
    return HttpResponse.json(newSession, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/operations/training/sessions/:id/participants`, async ({ params, request }) => {
    const body = await request.json();
    return updateTrainingSession(params.id, (session) => {
      const active = session.participants.filter((p) => p.status !== 'CANCELLED');
      if (active.length >= session.capacity) return { error: 'This session is full.' };
      if (active.some((p) => p.regNumber === body.regNumber)) return { error: 'This registration number is already signed up.' };
      const added = {
        id: `p-${Date.now()}`,
        name: body.name,
        regNumber: body.regNumber,
        department: body.department,
        contactEmail: body.contactEmail ?? null,
        userId: null,
        status: session.fee > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
        attendance: 'UNMARKED',
        passed: false,
        passedAt: null,
        registeredAt: new Date().toISOString(),
      };
      return { participants: [...session.participants, added] };
    }, 201);
  }),

  http.patch(`${API_BASE_URL}/operations/training/sessions/:id/attendance`, async ({ params, request }) => {
    const { participantId, attendance } = await request.json();
    return updateTrainingParticipant(params.id, participantId, (p) => (p.status !== 'CONFIRMED'
      ? { error: 'Attendance can only be recorded for confirmed participants.' }
      : { ...p, attendance }));
  }),

  http.post(`${API_BASE_URL}/operations/training/sessions/:id/participants/:participantId/confirm-payment`, ({ params }) =>
    updateTrainingParticipant(params.id, params.participantId, (p) => (p.status !== 'PENDING_PAYMENT'
      ? { error: 'This registration is not waiting for payment.' }
      : { ...p, status: 'CONFIRMED' }))),

  http.post(`${API_BASE_URL}/operations/training/sessions/:id/participants/:participantId/pass`, ({ params }) =>
    updateTrainingParticipant(params.id, params.participantId, (p, session) => {
      if (!session.safetyCourse) return { error: 'Only safety courses record a pass.' };
      if (p.status !== 'CONFIRMED' || p.attendance !== 'PRESENT') return { error: 'A participant must be marked present before passing.' };
      return { ...p, passed: true, passedAt: new Date().toISOString() };
    })),

  http.post(`${API_BASE_URL}/operations/training/mentorship`, async ({ request }) => {
    const body = await request.json();
    const created = { id: `mf-${Date.now()}`, status: 'PENDING_FOLLOW_UP', notes: null, priority: 'NORMAL', ...body, version: 0 };
    mentorshipFollowUps = [...mentorshipFollowUps, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/operations/training/mentorship/:id`, async ({ params, request }) => {
    const index = mentorshipFollowUps.findIndex((item) => item.id === params.id);
    if (index === -1) return trainingProblem(404, 'Follow-up not found.');
    const { status, notes, version } = await request.json();
    if (!status) return trainingProblem(400, 'A status is required.');
    const current = mentorshipFollowUps[index];
    if (version != null && version !== current.version) {
      return trainingProblem(409, 'Someone else updated this follow-up. Reload and try again.');
    }
    const updated = { ...current, status, notes: notes ?? current.notes, version: current.version + 1 };
    mentorshipFollowUps = mentorshipFollowUps.map((item, i) => (i === index ? updated : item));
    return HttpResponse.json(updated);
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

  // Operations / Multimedia - Equipment register, fault reporting
  http.get(`${API_BASE_URL}/operations/equipment`, () => {
    return HttpResponse.json(multimediaEquipment);
  }),

  http.post(`${API_BASE_URL}/operations/equipment/report-fault`, async ({ request }) => {
    const body = await request.json();
    const index = multimediaEquipment.findIndex((item) => item.id === body.equipmentId);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    multimediaEquipment[index] = {
      ...multimediaEquipment[index],
      state: 'FAULTY',
      note: body.description,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    return HttpResponse.json(multimediaEquipment[index]);
  }),

  // Facilities, bookings, equipment allocations and timetable
  http.get(`${API_BASE_URL}/facilities`, () => HttpResponse.json(facilities)),

  http.get(`${API_BASE_URL}/me/bookings`, ({ request }) => {
    const email = mockSubmitterEmail(request);
    if (!email) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 25);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
      return HttpResponse.json({ detail: 'The booking query parameters are invalid.' }, { status: 400 });
    }
    const mine = submitterBookings
      .filter((booking) => booking.requesterId.toLocaleLowerCase() === email)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const items = mine.slice(page * size, (page + 1) * size);
    return HttpResponse.json({
      items,
      page,
      size,
      totalElements: mine.length,
      totalPages: Math.ceil(mine.length / size),
    });
  }),

  http.post(`${API_BASE_URL}/me/bookings`, async ({ request }) => {
    const email = mockSubmitterEmail(request);
    if (!email) return new HttpResponse(null, { status: 401 });
    const body = await request.json();
    const facility = facilities.find((item) => item.id === body.facilityId);
    if (!facility) return bookingProblem(404, 'Facility not found.');
    const startsAt = Date.parse(body.startsAt);
    const endsAt = Date.parse(body.endsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
      return bookingProblem(400, 'The booking end time must be after the start time.');
    }
    if (!body.purpose?.trim() || body.purpose.length > 1000) {
      return bookingProblem(400, 'A purpose of up to 1000 characters is required.');
    }
    if (!Number.isInteger(body.attendees) || body.attendees < 1) {
      return bookingProblem(400, 'At least one attendee is required.');
    }
    if (facility.status === 'MAINTENANCE') {
      return bookingProblem(409, 'The facility is under maintenance and cannot be booked.');
    }
    if (body.attendees > facility.capacity) {
      return bookingProblem(400, 'The group size exceeds the facility capacity.');
    }
    const conflicts = [...bookings, ...submitterBookings].some((booking) => (
      booking.facilityId === facility.id
      && BLOCKING.includes(booking.status)
      && overlaps(booking.startsAt, booking.endsAt, body.startsAt, body.endsAt)
    ));
    if (conflicts) return bookingProblem(409, 'The facility is already booked for that time.');

    const now = new Date().toISOString();
    const sequence = nextSubmitterBookingNumber++;
    const created = {
      id: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
      reference: `BKG-2026-${String(sequence).padStart(6, '0')}`,
      facilityId: facility.id,
      facilityName: facility.name,
      facilityLocation: facility.location,
      requesterId: email,
      purpose: body.purpose.trim(),
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      attendees: body.attendees,
      operator: body.operator?.trim() || null,
      status: 'PENDING',
      rejectionReason: null,
      requestType: 'FACILITY',
      isEquipmentRequest: false,
      equipmentName: null,
      purposeDetail: null,
      decisionNote: null,
      decidedAt: null,
      conditionOut: null,
      conditionReturned: null,
      returnedAt: null,
      returnNotes: null,
      createdAt: now,
      updatedAt: now,
    };
    submitterBookings = [created, ...submitterBookings];
    publishMockNotification(
      created,
      'BOOKING_REQUESTED',
      `Booking request received: ${created.reference}`,
      `Your request for ${created.facilityName} has been submitted and is awaiting review.`,
    );
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/me/bookings/:id`, ({ params, request }) => {
    const result = findSubmitterBooking(request, params.id);
    return result.booking
      ? HttpResponse.json(result.booking)
      : new HttpResponse(null, { status: result.status });
  }),

  http.post(`${API_BASE_URL}/me/bookings/:id/cancel`, ({ params, request }) => {
    const result = findSubmitterBooking(request, params.id);
    if (!result.booking) return new HttpResponse(null, { status: result.status });
    if (!['PENDING', 'APPROVED'].includes(result.booking.status)) {
      return bookingProblem(409, 'Only pending or approved bookings can be cancelled.');
    }
    const updated = { ...result.booking, status: 'CANCELLED', updatedAt: new Date().toISOString() };
    submitterBookings = submitterBookings.map((item) => item.id === params.id ? updated : item);
    publishMockNotification(
      updated,
      'BOOKING_CANCELLED',
      `Booking cancelled: ${updated.reference}`,
      `Your booking for ${updated.facilityName} has been cancelled.`,
    );
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE_URL}/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');
    const items = bookings
      .filter((b) => !status || b.status === status)
      .filter((b) => !date || b.startsAt.slice(0, 10) === date || (b.startsAt.slice(0, 10) <= date && b.endsAt.slice(0, 10) >= date))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 });
  }),

  http.post(`${API_BASE_URL}/bookings`, async ({ request }) => {
    const body = await request.json();
    const facility = facilities.find((f) => f.id === body.facilityId);
    if (!facility) return bookingProblem(404, 'Facility not found.');
    if (new Date(body.endsAt) <= new Date(body.startsAt)) return bookingProblem(400, 'The booking end time must be after the start time.');
    if (facility.status === 'MAINTENANCE') return bookingProblem(409, 'The facility is under maintenance and cannot be booked.');
    if (body.attendees > facility.capacity) return bookingProblem(400, 'The group size exceeds the facility capacity.');
    if (bookings.some((b) => b.facilityId === facility.id && BLOCKING.includes(b.status) && overlaps(b.startsAt, b.endsAt, body.startsAt, body.endsAt))) {
      return bookingProblem(409, 'The facility is already booked for that time.');
    }
    if (timetableBlocks.some((t) => t.facility_id === facility.id && overlaps(t.starts_at, t.ends_at, body.startsAt, body.endsAt))) {
      return bookingProblem(409, 'The selected time clashes with a scheduled timetable block.');
    }
    const equipment = Boolean(body.isEquipmentRequest) || ['EQUIPMENT', 'ALLOCATION'].includes(String(body.requestType).toUpperCase());
    const now = new Date().toISOString();
    const created = {
      id: `bk-${Date.now()}`,
      reference: `BKG-2026-${String(200 + bookings.length).padStart(6, '0')}`,
      facilityId: facility.id,
      facilityName: facility.name,
      facilityLocation: facility.location,
      requesterId: 'test@unipod.test',
      purpose: body.purpose,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      attendees: body.attendees,
      operator: body.operator ?? null,
      status: 'PENDING',
      rejectionReason: null,
      requestType: equipment ? 'EQUIPMENT' : 'FACILITY',
      isEquipmentRequest: equipment,
      equipmentName: body.equipmentName ?? null,
      purposeDetail: body.purposeDetail ?? null,
      decisionNote: null,
      decidedAt: null,
      conditionOut: null,
      conditionReturned: null,
      returnedAt: null,
      returnNotes: null,
      createdAt: now,
      updatedAt: now,
    };
    bookings = [created, ...bookings];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/allocations/:id/decision`, async ({ params, request }) => {
    const { decision, note } = await request.json();
    const d = String(decision ?? '').toUpperCase();
    return updateBooking(params.id, (b) => {
      if (d === 'APPROVED') {
        return b.isEquipmentRequest
          ? { ...b, status: 'OUT', conditionOut: 'WORKING', decisionNote: note ?? null }
          : { ...b, status: 'APPROVED', decisionNote: note ?? null };
      }
      if (d === 'DECLINED' || d === 'REJECTED') {
        if (!note) return { error: [400, 'A rejection reason is required.'] };
        return { ...b, status: 'REJECTED', rejectionReason: note };
      }
      return { error: [400, 'decision must be APPROVED or DECLINED.'] };
    });
  }),

  http.post(`${API_BASE_URL}/allocations/:id/return`, async ({ params, request }) => {
    const body = await request.json();
    const condition = String(body.condition_returned ?? '').toUpperCase();
    const stored = { WORKING: 'WORKING', OK: 'WORKING', DAMAGED: 'DAMAGED', BEING_REPAIRED: 'BEING_REPAIRED', FAULTY: 'BEING_REPAIRED' }[condition];
    return updateBooking(params.id, (b) => {
      if (!stored) return { error: [400, 'condition_returned must be WORKING, BEING_REPAIRED, or DAMAGED.'] };
      if (!b.isEquipmentRequest || b.status !== 'OUT') return { error: [409, 'Only an out allocation can be returned.'] };
      return { ...b, status: 'RETURNED', conditionReturned: stored, returnedAt: body.returned_at, returnNotes: body.notes ?? null };
    });
  }),

  http.patch(`${API_BASE_URL}/facilities/:id/status`, async ({ params, request }) => {
    const { status } = await request.json();
    const index = facilities.findIndex((f) => f.id === params.id);
    if (index === -1) return bookingProblem(404, 'Facility not found.');
    if (!['AVAILABLE', 'BOOKED', 'MAINTENANCE'].includes(status)) return bookingProblem(400, 'Invalid facility status.');
    facilities = facilities.map((f, i) => (i === index ? { ...f, status, updatedAt: new Date().toISOString() } : f));
    return HttpResponse.json(facilities[index]);
  }),

  http.get(`${API_BASE_URL}/price-list-items`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const departmentId = params.get('departmentId');
    const status = params.get('status');
    const financePrices = initialPriceList.map((item, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 501).padStart(12, '0')}`,
      departmentId: '00000000-0000-4000-8000-000000000900',
      service: item.service,
      unit: ['PER_SESSION', 'PER_HOUR', 'PER_ITEM', 'PER_SESSION'][index],
      priceUgx: item.rateNumeric,
      effectiveFrom: '2026-10-01',
      status: 'ACTIVE',
      proposedBy: 'finance@unipod.test',
      updatedAt: '2026-10-01T08:00:00Z',
    }));
    const prices = departmentId ? initialCncPrices : financePrices;
    return HttpResponse.json(prices.filter((item) => (
      (!departmentId || item.departmentId === departmentId)
      && (!status || item.status === status)
    )));
  }),

  // CNC & Carpentry orders
  http.get(`${API_BASE_URL}/departments/cnc/orders`, () => {
    const columns = Object.fromEntries(CNC_STAGES.map((stage) => [stage, cncJobs.filter((j) => j.stage === stage)]));
    return HttpResponse.json({ department: 'CNC', columns, page: 0, size: 100, totalElements: cncJobs.length, totalPages: 1 });
  }),

  http.post(`${API_BASE_URL}/departments/cnc/orders`, async ({ request }) => {
    const body = await request.json();
    if (!body.title || !body.specs) return bookingProblem(400, 'title and specs are required.');
    const now = new Date().toISOString();
    const created = {
      id: `cnc-${Date.now()}`,
      code: `ORD-CNC-2026-${String(cncJobs.length + 1).padStart(6, '0')}`,
      department: 'CNC',
      customerId: 'cnc@unipod.test',
      title: body.title,
      quantity: body.quantity ?? 1,
      dateNeeded: body.date_needed ?? null,
      acceptedRulesVersion: body.accepted_rules_version ?? null,
      stage: 'NEW',
      specs: body.specs,
      quote: null, quoteSubmittedAt: null, quotedBy: null, invoiceId: null, invoiceStatus: null,
      materialsUsed: null, paymentConfirmedAt: null, machineTimeUsed: null, qualityChecklist: null, collectionSignature: null,
      stageHistory: [{ stage: 'NEW', at: now, by: 'cnc@unipod.test', notes: 'Order created' }],
      createdBy: 'cnc@unipod.test', createdAt: now, updatedAt: now,
    };
    cncJobs = [created, ...cncJobs];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/departments/cnc/orders/:id/quote`, async ({ params, request }) => {
    const { quote } = await request.json();
    const current = cncJobs.find((j) => j.id === params.id);
    if (!current) return bookingProblem(404, 'Order not found.');
    if (!quote || !(quote.amount > 0)) return bookingProblem(400, 'quote.amount must be > 0.');
    const updated = { ...current, quote, quoteSubmittedAt: new Date().toISOString(), quotedBy: 'cnc@unipod.test', invoiceId: `inv-${current.id}`, invoiceStatus: 'WAITING_FOR_PROOF' };
    cncJobs = cncJobs.map((j) => (j.id === current.id ? updated : j));
    return HttpResponse.json(updated);
  }),

  http.patch(`${API_BASE_URL}/departments/cnc/orders/:id/stage`, async ({ params, request }) => {
    const body = await request.json();
    const current = cncJobs.find((j) => j.id === params.id);
    if (!current) return bookingProblem(404, 'Order not found.');
    const target = String(body.stage ?? '').toUpperCase();
    if (!CNC_STAGES.includes(target)) return bookingProblem(400, `Invalid stage '${target}' for department CNC.`);
    if (CNC_STAGES.indexOf(target) < CNC_STAGES.indexOf(current.stage) && !['READY', 'COLLECTED'].includes(target)) {
      return bookingProblem(409, `Cannot move order backwards from ${current.stage} to ${target}.`);
    }
    if (target === 'SCHEDULED' && !current.quote) return bookingProblem(400, 'A quote must be submitted before scheduling.');
    const paid = ['PAID', 'RECEIPTED'].includes(current.invoiceStatus);
    if (['SCHEDULED', 'IN_PRODUCTION', 'READY', 'COLLECTED'].includes(target) && !paid) {
      return bookingProblem(409, `Payment is required before moving to ${target}.`);
    }
    const now = new Date().toISOString();
    const completion = ['READY', 'COLLECTED'].includes(target)
      ? { materialsUsed: body.materials_used ?? null, machineTimeUsed: body.machine_time_used ?? null, qualityChecklist: body.quality_checklist ?? null, collectionSignature: body.collection_signature ?? null }
      : {};
    const updated = {
      ...current,
      ...completion,
      stage: target,
      stageHistory: [...current.stageHistory, { stage: target, at: now, by: 'cnc@unipod.test', notes: body.notes ?? null }],
      updatedAt: now,
    };
    cncJobs = cncJobs.map((j) => (j.id === current.id ? updated : j));
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE_URL}/timetable/blocks`, ({ request }) => {
    const url = new URL(request.url);
    const facilityId = url.searchParams.get('facility_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    return HttpResponse.json(timetableBlocks.filter((t) => (!facilityId || t.facility_id === facilityId)
      && (!from || !to || overlaps(t.starts_at, t.ends_at, from, to))));
  }),

  // Operations / Multimedia - Event-coverage contracts
  http.get(`${API_BASE_URL}/media/contracts`, () => HttpResponse.json(eventContracts)),

  http.post(`${API_BASE_URL}/media/contracts`, async ({ request }) => {
    const body = await request.json();
    if (!body.client || !body.event_name || !body.event_date || !(body.agreed_price > 0)) {
      return HttpResponse.json({ status: 400, detail: 'The contract request is invalid.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const created = {
      id: `ct-${Date.now()}`,
      code: `MCTR-2026-${String(eventContracts.length + 1).padStart(4, '0')}`,
      client: body.client,
      eventName: body.event_name,
      eventDate: body.event_date,
      venue: body.venue ?? null,
      agreedPrice: body.agreed_price,
      currency: (body.currency ?? 'UGX').toUpperCase(),
      milestonePaymentDates: body.milestone_payment_dates ?? [],
      signedContractDocId: body.signed_contract_doc_id ?? null,
      assignedStaff: body.assigned_staff ?? [],
      status: 'DRAFT',
      invoiceIds: [],
      createdBy: 'test@unipod.test',
      createdAt: now,
      updatedAt: now,
    };
    eventContracts = [...eventContracts, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/media/contracts/:id/status`, async ({ params, request }) => {
    const index = eventContracts.findIndex((item) => item.id === params.id);
    if (index === -1) return HttpResponse.json({ status: 404, detail: 'Media contract not found.' }, { status: 404 });
    const { status, signed_contract_doc_id: docId } = await request.json();
    const current = eventContracts[index];
    const allowed = { DRAFT: ['SIGNED', 'CANCELLED'], SIGNED: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'CANCELLED'] };
    if (!(allowed[current.status] ?? []).includes(status)) {
      return HttpResponse.json({ status: 409, detail: `The media contract cannot move from ${current.status} to ${status}.` }, { status: 409 });
    }
    const signedDoc = status === 'SIGNED' ? (docId ?? current.signedContractDocId) : current.signedContractDocId;
    if (status === 'SIGNED' && !signedDoc) {
      return HttpResponse.json({ status: 400, detail: 'A signed contract document is required to mark the contract as signed.' }, { status: 400 });
    }
    const updated = { ...current, status, signedContractDocId: signedDoc, updatedAt: new Date().toISOString() };
    eventContracts = eventContracts.map((item, i) => (i === index ? updated : item));
    return HttpResponse.json(updated);
  }),

  // Department Rules Manager (Assignment 12)
  http.get(`${API_BASE_URL}/rules`, () => {
    return HttpResponse.json(rules);
  }),

  http.post(`${API_BASE_URL}/rules`, async ({ request }) => {
    const body = await request.json();
    const newRule = {
      id: `rule-${Date.now()}`,
      scope: 'GENERAL',
      scopeId: null,
      mustAccept: false,
      published: false,
      version: 1,
      updatedAt: new Date().toISOString().slice(0, 10),
      ...body,
    };
    rules = [...rules, newRule];
    return HttpResponse.json(newRule, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/rules/:id`, async ({ params, request }) => {
    const index = rules.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    rules[index] = {
      ...rules[index],
      ...body,
      version: rules[index].version + 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    return HttpResponse.json(rules[index]);
  }),

  http.post(`${API_BASE_URL}/rules/:id/retire`, ({ params }) => {
    const index = rules.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    rules[index] = { ...rules[index], published: false, updatedAt: new Date().toISOString().slice(0, 10) };
    return HttpResponse.json(rules[index]);
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

  http.get(`${API_BASE_URL}/me/invoices`, ({ request }) => {
    const email = mockSubmitterEmail(request);
    if (!email) return new HttpResponse(null, { status: 401 });
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 25);
    const status = url.searchParams.get('status');
    const statuses = ['WAITING_FOR_PROOF', 'WAITING_FOR_CHECK', 'PAID', 'RECEIPTED'];
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100
      || (status && !statuses.includes(status))) {
      return HttpResponse.json({ detail: 'The invoice query parameters are invalid.' }, { status: 400 });
    }

    const mine = submitterInvoices.filter((invoice) => invoice.customerEmail.toLocaleLowerCase() === email);
    const filtered = status ? mine.filter((invoice) => invoice.status === status) : mine;
    const items = filtered.slice(page * size, (page + 1) * size);
    return HttpResponse.json({
      items,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    });
  }),

  http.get(`${API_BASE_URL}/me/invoices/:id`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    return result.invoice
      ? HttpResponse.json(result.invoice)
      : new HttpResponse(null, { status: result.status });
  }),

  http.post(`${API_BASE_URL}/me/invoices/:id/proof`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    if (!result.invoice) return new HttpResponse(null, { status: result.status });
    const index = submitterInvoices.findIndex((invoice) => invoice.id === params.id);
    const invoice = result.invoice;
    if (invoice.status !== 'WAITING_FOR_PROOF') {
      return HttpResponse.json({ detail: 'Payment proof is no longer accepted for this invoice.' }, { status: 409 });
    }

    const updated = {
      ...invoice,
      status: 'WAITING_FOR_CHECK',
      statusLabel: 'Payment evidence under review',
      updatedAt: new Date().toISOString(),
      paymentProof: {
        id: '00000000-0000-4000-8000-000000000304',
        reference: 'DEMO-PAYMENT-REFERENCE',
        amount: invoice.amount,
        paidOn: '2026-11-18',
        contentType: 'application/pdf',
        fileSize: 1024,
        originalFilename: 'payment-proof.pdf',
        status: 'PENDING',
        rejectionReason: null,
        uploadedBy: invoice.customerEmail,
        uploadedAt: new Date().toISOString(),
        verifiedBy: null,
        verifiedAt: null,
      },
    };
    submitterInvoices[index] = updated;
    return HttpResponse.json(updated, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/me/invoices/:id/proof/file`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    if (!result.invoice?.paymentProof) return new HttpResponse(null, { status: result.status === 200 ? 404 : result.status });
    return new HttpResponse(new Blob([`Mock payment proof for ${result.invoice.number}`]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  http.get(`${API_BASE_URL}/me/invoices/:id/receipt`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    if (!result.invoice) return new HttpResponse(null, { status: result.status });
    return result.invoice.receipt
      ? HttpResponse.json(result.invoice.receipt)
      : new HttpResponse(null, { status: 404 });
  }),

  http.get(`${API_BASE_URL}/me/invoices/:id/receipt/download`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    if (!result.invoice?.receipt) return new HttpResponse(null, { status: result.status === 200 ? 404 : result.status });
    return new HttpResponse(`Receipt ${result.invoice.receipt.receiptNumber}`, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }),

  http.get(`${API_BASE_URL}/me/invoices/:id/pdf`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    if (!result.invoice) return new HttpResponse(null, { status: result.status });
    return new HttpResponse(new Blob([`Mock invoice PDF for ${result.invoice.number}`], { type: 'application/pdf' }));
  }),

  http.get(`${API_BASE_URL}/me/invoices/:id/receipt/pdf`, ({ params, request }) => {
    const result = findSubmitterInvoice(request, params.id);
    if (!result.invoice?.receipt) return new HttpResponse(null, { status: result.status === 200 ? 404 : result.status });
    return new HttpResponse(new Blob([`Mock receipt PDF for ${result.invoice.receipt.receiptNumber}`], { type: 'application/pdf' }));
  }),

  // Finance / Overview (Daniel Kato, Finance Officer)
  http.get(`${API_BASE_URL}/finance/overview`, () => {
    return HttpResponse.json(initialFinanceOverview);
  }),

  http.get(`${API_BASE_URL}/finance/summary`, () => {
    const waitingForProof = invoices.filter((inv) => inv.status === 'Pending evidence').length;
    const waitingForCheck = invoices.filter((inv) => inv.status === 'Awaiting verification').length;
    const paid = invoices.filter((inv) => inv.status === 'Verified').length;
    const receipted = invoices.filter((inv) => inv.status === 'Receipted').length;

    return HttpResponse.json({
      totalInvoices: invoices.length,
      waitingForProof,
      waitingForCheck,
      paid,
      receipted,
      outstandingUgx: 340000,
      collectedUgx: 1620000,
    });
  }),

  http.get(`${API_BASE_URL}/invoices`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filtered = status
      ? invoices.filter((inv) => {
          const mapped = invoiceStatusMap[inv.status];
          return mapped === status;
        })
      : invoices;

    return HttpResponse.json({
      items: filtered.map(toApiInvoice),
      page: 0,
      size: filtered.length,
      totalElements: filtered.length,
      totalPages: 1,
    });
  }),

  http.get(`${API_BASE_URL}/invoices/:id`, ({ params }) => {
    const id = params.id;
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(toApiInvoice(invoice));
  }),

  http.get(`${API_BASE_URL}/invoices/:id/proof/file`, ({ params }) => {
    const invoice = invoices.find((item) => item.id === params.id);
    if (!invoice?.paymentReference) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(new Blob([`Payment proof for ${invoice.invoiceNumber}`]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  http.get(`${API_BASE_URL}/invoices/:id/receipt/download`, ({ params }) => {
    const invoice = invoices.find((item) => item.id === params.id);
    if (!invoice?.receiptNumber) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(`Receipt ${invoice.receiptNumber}`, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }),

  http.post(`${API_BASE_URL}/invoices/:id/verify`, async ({ params, request }) => {
    const id = params.id;
    const url = new URL(request.url);
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });

    const proofId = url.searchParams.get('proofId');
    if (!proofId) {
      return new HttpResponse(JSON.stringify({ message: 'proofId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    invoices[index] = { ...invoices[index], status: 'Verified', paymentReference: invoices[index].paymentReference || 'BANK-REF-AUTOUPLOAD' };
    return HttpResponse.json(toApiInvoice(invoices[index]));
  }),

  http.post(`${API_BASE_URL}/invoices/:id/reject`, async ({ params, request }) => {
    const body = await request.json();
    const index = invoices.findIndex((inv) => inv.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    if (!body.proofId || !body.reason) {
      return HttpResponse.json({ message: 'proofId and reason are required' }, { status: 400 });
    }

    invoices[index] = {
      ...invoices[index],
      status: 'Pending evidence',
      paymentProofStatus: 'REJECTED',
      rejectionReason: body.reason,
    };
    return HttpResponse.json(toApiInvoice(invoices[index]));
  }),

  http.post(`${API_BASE_URL}/invoices/:id/receipt`, ({ params }) => {
    const id = params.id;
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    if (invoices[index].status !== 'Verified') {
      return new HttpResponse(
        JSON.stringify({ message: 'Cannot release receipt: payment has not been verified.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const receiptNumber = `REC-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    invoices[index] = { ...invoices[index], status: 'Receipted', receiptNumber };
    return HttpResponse.json(toApiInvoice(invoices[index]));
  }),

  http.post(`${API_BASE_URL}/invoices/:id/evidence`, async ({ params, request }) => {
    const id = params.id;
    const formData = await request.formData();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return new HttpResponse(null, { status: 404 });

    const paymentReference = (formData.get('reference') || 'BANK-REF-AUTOUPLOAD').toString();
    invoices[index] = {
      ...invoices[index],
      status: 'Awaiting verification',
      paymentReference,
    };
    return HttpResponse.json(toApiInvoice(invoices[index]));
  }),

  // Finance / Price Lists & Invoices legacy route retained for mocked UI compatibility
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
  ...telecomsHandlers,
  ...cncStockHandlers,
];
