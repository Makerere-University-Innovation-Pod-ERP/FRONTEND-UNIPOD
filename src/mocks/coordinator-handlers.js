import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import {
  coordinatorBriefs,
  coordinatorQueue,
  projectCodeSequence,
  reviewComments,
  reviewerPool,
  reviewRounds,
  suggestedChanges,
  versionHistory,
} from './fixtures/coordinator';
import { areReviewsComplete, decisionLockedReason, findOutcome, projectCodePrefix } from '@/lib/case-status';

/**
 * Mock network layer for the Innovation Coordinator pipeline (Assignment 2).
 * Kept in its own module so src/mocks/handlers.js only needs a one-line
 * spread, and so this role's mocks can move to the real backend
 * independently of the other roles'.
 */

/**
 * Recorded reviews with their written comments. Shared by the decision screen
 * and the ask-for-changes screen; the plain brief endpoint never calls it, so
 * comments stay off page 1.
 */
const reviewsFor = (brief) =>
  brief.reviewPanel.assignments.map((assignment) => {
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
      // A brief enters refinement the moment the coordinator decides "Needs
      // more improvement"; the request itself is written afterwards on page 4.
      // Both states belong in this queue, so a brief awaiting its request is
      // not lost — its dates are simply null until it is written.
      .filter((brief) => brief.stage === 'REFINEMENT_REQUESTED')
      .map((brief) => ({
        id: brief.id,
        code: brief.code,
        title: brief.title,
        submitterName: brief.submitterName,
        requestedAt: brief.refinement?.requestedAt ?? null,
        dueDate: brief.refinement?.dueDate ?? null,
        versions: brief.versions,
        stage: brief.stage,
      }))
      // Soonest deadline first; cases with no deadline yet sort to the top,
      // since writing the request is the outstanding action.
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    return HttpResponse.json({ items });
  }),

  http.get(`${API_BASE_URL}/coordinator/briefs/:id/versions`, ({ params }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    const open = brief.stage === 'REFINEMENT_REQUESTED';
    return HttpResponse.json({
      brief,
      versions: versionHistory[brief.id] ?? [],
      rounds: reviewRounds[brief.id] ?? [],
      refinement: brief.refinement ?? null,
      canRecordVersion: open && Boolean(brief.refinement),
      blockedReason: open
        ? brief.refinement
          ? null
          : 'Write the improvement request before recording a new version.'
        : `An improved version can only be recorded while the brief is awaiting improvement (currently ${brief.stage
            .replaceAll('_', ' ')
            .toLowerCase()}).`,
    });
  }),

  http.post(`${API_BASE_URL}/coordinator/briefs/:id/versions`, async ({ params, request }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    if (brief.stage !== 'REFINEMENT_REQUESTED' || !brief.refinement) {
      return HttpResponse.json(
        { detail: 'This brief is not awaiting an improved version.' },
        { status: 409 },
      );
    }

    const body = await request.json();
    const summaryOfChanges =
      typeof body.summaryOfChanges === 'string' ? body.summaryOfChanges.trim() : '';
    const addressedChanges = Array.isArray(body.addressedChanges)
      ? body.addressedChanges.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const revisedSummary =
      typeof body.revisedSummary === 'string' ? body.revisedSummary.trim() : '';

    if (summaryOfChanges.length < 10) {
      return HttpResponse.json(
        { detail: 'Say what changed in this version.' },
        { status: 400 },
      );
    }
    if (!addressedChanges.length) {
      return HttpResponse.json(
        { detail: 'Tick at least one change this version addresses.' },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const history = (versionHistory[brief.id] ??= []);
    const previous = history[history.length - 1] ?? null;

    // 1. Archive the round that judged the PREVIOUS version. Every decision,
    //    comment and date is carried over untouched and tied to that version.
    if (brief.reviewPanel.assignments.length) {
      const rounds = (reviewRounds[brief.id] ??= []);
      rounds.push({
        round: rounds.length + 1,
        version: previous?.version ?? brief.versions,
        mode: brief.reviewPanel.mode,
        requiredReviews: brief.reviewPanel.requiredReviews,
        completedReviews: brief.reviewPanel.completedReviews,
        closedAt: today,
        reviews: reviewsFor(brief),
      });
    }

    // 2. Append the new version — nothing earlier is rewritten.
    const nextVersion = (previous?.version ?? brief.versions) + 1;
    history.push({
      version: nextVersion,
      submittedAt: today,
      submittedBy: brief.submitterName,
      summaryOfChanges,
      addressedChanges,
      title: brief.title,
      summary: revisedSummary || previous?.summary || brief.summary,
      purpose: previous?.purpose ?? brief.purpose,
      problemAddressed: previous?.problemAddressed ?? brief.problemAddressed,
      documents: previous?.documents ?? [],
    });

    // 3. Return to review with a FRESH panel: progress starts at 0 for the
    //    new version, and the coordinator reassigns on page 1.
    brief.versions = nextVersion;
    brief.stage = 'UNDER_REVIEW';
    brief.updatedAt = today;
    if (revisedSummary) brief.summary = revisedSummary;
    brief.reviewPanel = {
      mode: brief.reviewPanel.mode,
      requiredReviews: 0,
      completedReviews: 0,
      dueDate: null,
      assignments: [],
    };
    if (body.resolvesRequest) brief.refinement = { ...brief.refinement, status: 'resolved' };

    return HttpResponse.json({
      brief,
      versions: history,
      rounds: reviewRounds[brief.id] ?? [],
      refinement: brief.refinement,
      canRecordVersion: false,
      blockedReason: null,
    });
  }),

  http.get(`${API_BASE_URL}/coordinator/briefs/:id/changes`, ({ params }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    const inRefinement = brief.stage === 'REFINEMENT_REQUESTED';
    return HttpResponse.json({
      brief,
      reviews: reviewsFor(brief),
      refinement: brief.refinement ?? null,
      suggestedChanges,
      canRequestChanges: inRefinement && !brief.refinement,
      blockedReason: inRefinement
        ? null
        : `Changes can only be requested once the brief is awaiting improvement (currently ${brief.stage
            .replaceAll('_', ' ')
            .toLowerCase()}).`,
    });
  }),

  http.post(`${API_BASE_URL}/coordinator/briefs/:id/changes`, async ({ params, request }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    // A written request is never silently replaced — the applicant may already
    // be working to it.
    if (brief.refinement) {
      return HttpResponse.json(
        { detail: 'An improvement request has already been written for this brief.' },
        { status: 409 },
      );
    }
    if (brief.stage !== 'REFINEMENT_REQUESTED') {
      return HttpResponse.json(
        { detail: 'This brief is not awaiting improvement.' },
        { status: 409 },
      );
    }

    const body = await request.json();
    const changes = Array.isArray(body.changes)
      ? body.changes.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const guidance = typeof body.guidance === 'string' ? body.guidance.trim() : '';
    const dueDate = typeof body.dueDate === 'string' ? body.dueDate : '';

    if (!changes.length) {
      return HttpResponse.json({ detail: 'List at least one change.' }, { status: 400 });
    }
    if (guidance.length < 10) {
      return HttpResponse.json(
        { detail: 'Write instructions for the applicant.' },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return HttpResponse.json({ detail: 'Set a due date.' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    brief.refinement = {
      requestedAt: today,
      dueDate,
      requestedBy: 'Sarah Kintu',
      changes,
      guidance,
      status: 'open',
    };
    brief.updatedAt = today;

    return HttpResponse.json({
      brief,
      reviews: reviewsFor(brief),
      refinement: brief.refinement,
      suggestedChanges,
      canRequestChanges: false,
      blockedReason: null,
    });
  }),

  http.get(`${API_BASE_URL}/coordinator/briefs/:id/decision`, ({ params }) => {
    const brief = coordinatorBriefs[params.id];
    if (!brief) return new HttpResponse(null, { status: 404 });

    const reviews = reviewsFor(brief);

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
