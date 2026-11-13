import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import {
  coordinatorBriefs,
  coordinatorQueue,
  projectCodeSequence,
  reviewComments,
  reviewerPool,
} from './fixtures/coordinator';
import { areReviewsComplete, decisionLockedReason, findOutcome, projectCodePrefix } from '@/lib/case-status';

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

  /**
   * The "Ideas being improved" queue (page 3). Filtered to briefs awaiting an
   * improved version — search and the deadline filters are applied in the
   * page, over this list.
   */
  http.get(`${API_BASE_URL}/coordinator/improvements`, () => {
    const items = Object.values(coordinatorBriefs)
      .filter((brief) => brief.stage === 'REFINEMENT_REQUESTED' && brief.refinement)
      .map((brief) => ({
        id: brief.id,
        code: brief.code,
        title: brief.title,
        submitterName: brief.submitterName,
        requestedAt: brief.refinement.requestedAt,
        dueDate: brief.refinement.dueDate,
        versions: brief.versions,
        stage: brief.stage,
      }))
      .sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
    return HttpResponse.json({ items });
  }),

  http.get(`${API_BASE_URL}/coordinator/briefs/:id/decision`, ({ params }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    const reviews = brief.reviewPanel.assignments.map((assignment) => {
      const recorded = reviewComments[`${brief.id}:${assignment.reviewerId}`] ?? null;
      return {
        reviewerId: assignment.reviewerId,
        reviewerName: assignment.reviewerName,
        step: assignment.step,
        of: assignment.of,
        decisionStatus: assignment.decisionStatus,
        comment: recorded?.comment ?? null,
        decidedAt: recorded?.decidedAt ?? null,
      };
    });

    const complete = areReviewsComplete(brief.reviewPanel);
    const decidable = brief.stage === 'UNDER_REVIEW' && complete;
    const lockedReason = decidable
      ? null
      : brief.stage !== 'UNDER_REVIEW'
        ? `A decision can only be recorded while the brief is under review (currently ${brief.stage.replaceAll('_', ' ').toLowerCase()}).`
        : decisionLockedReason(brief.reviewPanel);

    return HttpResponse.json({
      brief,
      reviews,
      canRecordDecision: decidable,
      lockedReason,
    });
  }),

  http.post(`${API_BASE_URL}/coordinator/briefs/:id/decision`, async ({ params, request }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    // A recorded decision is never overwritten — re-deciding is a conflict,
    // not an update.
    if (brief.outcome) {
      return HttpResponse.json(
        { detail: 'A decision has already been recorded for this brief.' },
        { status: 409 },
      );
    }
    if (brief.stage !== 'UNDER_REVIEW' || !areReviewsComplete(brief.reviewPanel)) {
      return HttpResponse.json(
        { detail: decisionLockedReason(brief.reviewPanel) },
        { status: 409 },
      );
    }

    const body = await request.json();
    const outcome = findOutcome(body.outcome);
    if (!outcome) {
      return HttpResponse.json({ detail: 'Unknown decision outcome.' }, { status: 400 });
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (outcome.requiresReason && reason.length < 10) {
      return HttpResponse.json(
        { detail: 'A closed decision needs a written reason.' },
        { status: 400 },
      );
    }

    let projectCode = null;
    if (outcome.generatesProjectCode) {
      const prefix = projectCodePrefix(brief.category);
      const year = new Date().getFullYear();
      const sequenceKey = `${prefix}-${year}`;
      const next = projectCodeSequence[sequenceKey] ?? 1;
      projectCodeSequence[sequenceKey] = next + 1;
      projectCode = `${sequenceKey}-${String(next).padStart(3, '0')}`;
      brief.code = projectCode;
    }

    // Reviews and version history are untouched: only the outcome and stage
    // move forward.
    brief.stage = outcome.toStage;
    brief.outcome = {
      status: outcome.outcomeStatus,
      reason: reason || null,
      projectCode,
    };
    brief.updatedAt = new Date().toISOString().slice(0, 10);

    return HttpResponse.json(brief);
  }),
];
