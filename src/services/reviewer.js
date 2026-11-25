import { z } from 'zod';
import { ApiError } from './api-client';
import { backendApi } from './backend-api';

/**
 * A REVIEWER works the real case-file aggregate (GET /cases/{id}, the same
 * one Assignment 2/5's other roles use) plus three small, reviewer-specific
 * endpoints: GET /queues/reviews (the reviewer's own queue, row-level
 * enforced by the backend — no client-side filtering needed), POST
 * /cases/{id}/reviews (submitReview, immutable once submitted), and GET
 * /cases/{id}/my-review (reads back this reviewer's own decision, if any).
 * It never exposes a reviewer-assignment action — that stays an Innovation
 * Coordinator / Sector Officer action (Assignment 2 / 5's department-intake
 * side).
 */

export const reviewerDecisionStatusSchema = z.enum(['pending', 'recommended', 'changes_needed', 'not_recommended']);

export const reviewerAssignedCaseSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: z.string(),
  assignedAt: z.string(),
  pendingAction: z.string(),
  decisionStatus: reviewerDecisionStatusSchema,
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(['recommended', 'changes_needed', 'not_recommended']),
  comment: z.string().min(1, 'A comment is required for every decision.'),
});

// The rest of the API uses UPPER_SNAKE_CASE enums throughout (stages,
// statuses) — the review decision sent over the wire is assumed to follow
// the same convention until the backend team confirms otherwise.
const DECISION_WIRE_VALUE = {
  recommended: 'RECOMMENDED',
  changes_needed: 'CHANGES_NEEDED',
  not_recommended: 'NOT_RECOMMENDED',
};
const DECISION_FROM_WIRE = Object.fromEntries(
  Object.entries(DECISION_WIRE_VALUE).map(([key, value]) => [value, key]),
);

// Case-stage fallback used only when this reviewer has not opened the case
// yet (so no GET .../my-review round trip has happened for it): a case
// already sent back for changes reads as "changes needed" at the queue
// level; everything else reads as still awaiting this reviewer's decision.
function decisionStatusForStage(stage) {
  return stage === 'IMPROVEMENT_REQUESTED' || stage === 'REFINEMENT_REQUESTED' ? 'changes_needed' : 'pending';
}

function pendingActionFor(decisionStatus) {
  return decisionStatus === 'changes_needed'
    ? 'Changes requested — waiting on resubmission'
    : 'Submit your independent decision';
}

async function myReviewOrNull(token, id, signal) {
  try {
    return await backendApi.myReview(token, id, signal);
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 404) return null;
    throw reason;
  }
}

export const reviewerApi = {
  assigned: async (token, signal) => {
    const payload = await backendApi.reviewQueue(token, signal);
    return payload.items.map((item) => {
      const decisionStatus = decisionStatusForStage(item.stage);
      return reviewerAssignedCaseSchema.parse({
        id: item.id,
        code: item.code,
        title: item.title,
        category: item.category,
        stage: item.stage,
        assignedAt: item.assignedAt,
        pendingAction: pendingActionFor(decisionStatus),
        decisionStatus,
      });
    });
  },
  caseSummary: async (token, id, signal) => {
    const [caseFile, myReview] = await Promise.all([
      backendApi.caseFile(token, id, signal),
      myReviewOrNull(token, id, signal),
    ]);
    const { submission, documents } = caseFile;
    const decisionStatus = myReview
      ? DECISION_FROM_WIRE[myReview.decision] ?? 'pending'
      : decisionStatusForStage(submission.stage);
    return {
      id: submission.id,
      code: submission.code,
      title: submission.title,
      purpose: submission.purpose,
      problemAddressed: submission.problemAddressed,
      stage: submission.stage,
      documents,
      pendingAction: pendingActionFor(decisionStatus),
      decisionStatus,
      comment: myReview?.comment ?? null,
      decidedAt: myReview?.decidedAt ?? null,
    };
  },
  submitDecision: async (token, id, body) => {
    const { decision, comment } = reviewDecisionSchema.parse(body);
    await backendApi.submitReview(token, id, { decision: DECISION_WIRE_VALUE[decision], comment });
    return reviewerApi.caseSummary(token, id);
  },
};
