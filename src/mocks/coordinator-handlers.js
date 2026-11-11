import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { coordinatorBriefs, coordinatorQueue, reviewerPool } from './fixtures/coordinator';

/**
 * Mock network layer for the Innovation Coordinator pipeline (Assignment 2).
 * Kept in its own module so src/mocks/handlers.js only needs a one-line
 * spread, and so this role's mocks can move to the real backend
 * independently of the other roles'.
 */

export const coordinatorMockUsers = {
  'coordinator@unipod.test': {
    subject: 'Sarah Kintu',
    roles: ['ROLE_INNOVATION_COORDINATOR'],
  },
};

export const coordinatorHandlers = [
  http.get(`${API_BASE_URL}/coordinator/briefs`, () =>
    HttpResponse.json({ items: coordinatorQueue() }),
  ),

  http.get(`${API_BASE_URL}/coordinator/reviewers`, () =>
    HttpResponse.json({ items: reviewerPool }),
  ),

  http.get(`${API_BASE_URL}/coordinator/briefs/:id`, ({ params }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(brief);
  }),

  http.post(`${API_BASE_URL}/coordinator/briefs/:id/reviewers`, async ({ params, request }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    const body = await request.json();
    const reviewerIds = Array.isArray(body.reviewerIds) ? body.reviewerIds : [];
    const mode = body.mode === 'sequential' ? 'sequential' : 'parallel';
    const dueDate = typeof body.dueDate === 'string' && body.dueDate ? body.dueDate : null;
    const assignedAt = new Date().toISOString().slice(0, 10);

    const alreadyAssigned = new Set(brief.reviewPanel.assignments.map((item) => item.reviewerId));
    const duplicate = reviewerIds.find((id) => alreadyAssigned.has(id));
    if (duplicate) {
      const name = reviewerPool.find((item) => item.id === duplicate)?.name ?? 'That reviewer';
      return HttpResponse.json(
        { detail: `${name} is already assigned to this brief.` },
        { status: 409 },
      );
    }

    const added = reviewerIds
      .map((id) => reviewerPool.find((item) => item.id === id))
      .filter(Boolean)
      .map((reviewer) => ({
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        mode,
        step: 0,
        of: 0,
        decisionStatus: 'pending',
        assignedAt,
        dueDate,
      }));

    // Append-only: existing assignments and their recorded decisions are never
    // overwritten, only renumbered so step n/m stays truthful.
    const assignments = [...brief.reviewPanel.assignments, ...added].map((item, index, all) => ({
      ...item,
      mode,
      step: index + 1,
      of: all.length,
    }));

    const requiredReviews = Number.isFinite(Number(body.requiredReviews))
      ? Math.max(1, Number(body.requiredReviews))
      : assignments.length;

    brief.reviewPanel = {
      mode,
      requiredReviews,
      completedReviews: assignments.filter((item) => item.decisionStatus !== 'pending').length,
      dueDate,
      assignments,
    };
    if (brief.stage === 'FACT_FINDING') brief.stage = 'UNDER_REVIEW';
    brief.updatedAt = assignedAt;

    return HttpResponse.json(brief);
  }),
];
