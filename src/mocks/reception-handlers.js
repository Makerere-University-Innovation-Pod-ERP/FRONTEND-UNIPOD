import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { makeMockToken } from './jwt';
import { knownSubmitterAccounts, receptionBriefs, receptionDepartments } from './fixtures/reception';

/** Fake sign-in account for the Reception screens (any password works). */
export const receptionMockUsers = {
  'reception@unipod.test': { subject: 'Reception Desk', roles: ['ROLE_RECEPTIONIST'] },
};

/**
 * Accounts created on the mock Sign up screen. They sign in as submitters.
 * The shared login handler in handlers.js looks here too.
 */
export const registeredMockUsers = {};

const RECENT_DAYS = 7;

/** Reads the user's name out of the fake token. The real backend does this securely. */
function whoIsCalling(request) {
  try {
    const token = (request.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.name || payload.sub || 'Unknown user';
  } catch {
    return 'Unknown user';
  }
}

function findBrief(id) {
  return receptionBriefs.find((brief) => brief.id === id);
}

function isWaitingAtReception(brief) {
  return brief.stage === 'RECEIVED';
}

function isRecent(date) {
  return Date.now() - new Date(date).getTime() <= RECENT_DAYS * 24 * 60 * 60 * 1000;
}

function matchesSearch(brief, search) {
  if (!search) return true;
  const text = `${brief.id} ${brief.title} ${brief.submitter.name}`.toLowerCase();
  return text.includes(search.toLowerCase());
}

function toSummary(brief) {
  return {
    id: brief.id,
    title: brief.title,
    category: brief.category,
    submitterName: brief.submitter.name,
    stage: brief.stage,
    submittedAt: brief.submittedAt,
    updatedAt: brief.updatedAt,
    missingCount: brief.documents.filter((document) => document.status === 'MISSING').length,
    dueDate: brief.openRequest?.dueDate ?? null,
  };
}

/** Every action is written to history with date, user and destination. */
function addHistory(brief, by, action, destination, note) {
  const at = new Date().toISOString();
  brief.history.push({ id: `h-${brief.history.length + 1}`, at, by, action, destination, note });
  brief.updatedAt = at;
}

function errorResponse(status, message) {
  return HttpResponse.json({ message }, { status });
}

export const receptionHandlers = [
  http.post(`${API_BASE_URL}/auth/signup`, async ({ request }) => {
    const body = await request.json();
    const email = (body.email ?? '').trim().toLowerCase();
    if (!['STUDENT', 'PUBLIC', 'ORGANISATION'].includes(body.accountKind)) return errorResponse(400, 'Choose who you are signing up as.');
    if (!email || !(body.fullName ?? '').trim() || !(body.phone ?? '').trim()) return errorResponse(400, 'Fill in your name, email and phone.');
    if (body.accountKind === 'STUDENT' && (!body.studentNumber || !body.course || !body.universityEmail)) {
      return errorResponse(422, 'Enter your student number, course and university email.');
    }
    if (body.accountKind === 'ORGANISATION' && !body.organisationName) return errorResponse(422, 'Enter the organisation name.');
    if (body.password?.length < 12 || body.password?.length > 72) return errorResponse(422, 'Password must be 12 to 72 characters.');
    if (body.rulesAccepted !== true || !body.rulesVersion) return errorResponse(400, 'Accept the UniPod general rules to continue.');
    if (email.endsWith('@unipod.test') || registeredMockUsers[email]) {
      return errorResponse(409, 'An account with this email already exists.');
    }
    const id = `user-${Object.keys(registeredMockUsers).length + 1}`;
    registeredMockUsers[email] = { id, subject: body.fullName.trim(), roles: ['ROLE_SUBMITTER'] };
    return HttpResponse.json({
      tokenType: 'Bearer',
      accessToken: makeMockToken(['ROLE_SUBMITTER'], body.fullName.trim()),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
      mustChangePassword: false,
    }, { status: 201 });
  }),

  // Walk-in: find the person's account by email, or create a minimal one.
  http.post(`${API_BASE_URL}/reception/walk-in-accounts`, async ({ request }) => {
    const body = await request.json();
    const email = (body.email ?? '').trim().toLowerCase();
    const fullName = (body.fullName ?? '').trim();
    if (!email || !fullName) return errorResponse(400, 'Fill in the name and email of the person.');
    if (!['student', 'public', 'organisation'].includes(body.type)) return errorResponse(400, 'Choose who the person is.');
    const known = knownSubmitterAccounts.find((account) => account.email === email);
    if (known) return HttpResponse.json({ ...known, existing: true });
    const registered = registeredMockUsers[email];
    if (registered) {
      return HttpResponse.json({ submitterId: registered.id, fullName: registered.subject, email, type: body.type, existing: true });
    }
    const submitterId = `user-${Object.keys(registeredMockUsers).length + 1}`;
    registeredMockUsers[email] = { id: submitterId, subject: fullName, roles: ['ROLE_SUBMITTER'] };
    return HttpResponse.json({ submitterId, fullName, email, type: body.type, existing: false }, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/reception/departments`, () => HttpResponse.json(receptionDepartments)),

  http.get(`${API_BASE_URL}/reception/briefs`, ({ request }) => {
    const search = new URL(request.url).searchParams.get('q') ?? '';
    const atReception = receptionBriefs.filter(isWaitingAtReception);
    const newBriefs = atReception.filter((brief) => !brief.openRequest);
    return HttpResponse.json({
      counters: {
        waiting: newBriefs.length,
        missingDocuments: atReception.filter((brief) => brief.openRequest).length,
        updatedRecently: atReception.filter((brief) => isRecent(brief.updatedAt)).length,
      },
      items: newBriefs.filter((brief) => matchesSearch(brief, search)).map(toSummary),
    });
  }),

  http.get(`${API_BASE_URL}/reception/missing-documents`, ({ request }) => {
    const search = new URL(request.url).searchParams.get('q') ?? '';
    return HttpResponse.json(
      receptionBriefs
        .filter((brief) => isWaitingAtReception(brief) && brief.openRequest)
        .filter((brief) => matchesSearch(brief, search))
        .map(toSummary),
    );
  }),

  http.get(`${API_BASE_URL}/reception/briefs/:id`, ({ params }) => {
    const brief = findBrief(params.id);
    return brief ? HttpResponse.json(brief) : errorResponse(404, 'This brief was not found.');
  }),

  http.post(`${API_BASE_URL}/reception/briefs/:id/comments`, async ({ params, request }) => {
    const brief = findBrief(params.id);
    if (!brief) return errorResponse(404, 'This brief was not found.');
    const body = await request.json();
    const note = (body.note ?? '').trim();
    if (!note) return errorResponse(400, 'Write a comment first.');
    addHistory(brief, whoIsCalling(request), 'COMMENT', null, note);
    return HttpResponse.json(brief);
  }),

  http.post(`${API_BASE_URL}/reception/briefs/:id/missing-info`, async ({ params, request }) => {
    const brief = findBrief(params.id);
    if (!brief) return errorResponse(404, 'This brief was not found.');
    if (!isWaitingAtReception(brief)) return errorResponse(409, 'This brief has already left reception.');
    const body = await request.json();
    const items = (body.items ?? []).map((item) => item.trim()).filter(Boolean);
    if (!items.length) return errorResponse(400, 'List at least one missing item.');
    if (!body.dueDate) return errorResponse(400, 'Choose a due date.');
    const by = whoIsCalling(request);
    brief.openRequest = {
      items,
      note: (body.note ?? '').trim(),
      dueDate: body.dueDate,
      requestedAt: new Date().toISOString(),
      requestedBy: by,
    };
    addHistory(brief, by, 'MISSING_INFO_REQUESTED', 'Submitter', items.join(', '));
    return HttpResponse.json(brief);
  }),

  http.post(`${API_BASE_URL}/reception/briefs/:id/forward`, async ({ params, request }) => {
    const brief = findBrief(params.id);
    if (!brief) return errorResponse(404, 'This brief was not found.');
    if (!isWaitingAtReception(brief)) return errorResponse(409, 'This brief has already left reception.');
    const body = await request.json();
    const ticked = body.checkedItemIds ?? [];
    if (!brief.checklist.every((item) => ticked.includes(item.id))) {
      return errorResponse(409, 'Tick every item on the check list before forwarding.');
    }
    const department = receptionDepartments.find((candidate) => candidate.id === body.departmentId);
    if (!department) return errorResponse(400, 'Choose a department.');
    brief.checklist = brief.checklist.map((item) => ({ ...item, checked: true }));
    brief.stage = 'FORWARDED';
    brief.forwardedTo = department.name;
    addHistory(brief, whoIsCalling(request), 'FORWARDED', department.name, (body.comment ?? '').trim());
    return HttpResponse.json(brief);
  }),
];
