import { z } from 'zod';
import { request } from './api-client';
import { REVIEW_DECISION_STATUSES, REVIEW_MODES, STAGES } from '@/lib/case-status';

/**
 * Innovation Coordinator decision pipeline — Assignment 2.
 *
 * These /coordinator/* endpoints are not part of the deployed backend
 * contract yet (same situation as services/fact-finding.js and
 * services/reviewer.js). They are served by MSW from
 * src/mocks/coordinator-handlers.js until the backend publishes the real
 * shapes; the Zod schemas below are the contract this screen expects.
 *
 * Deliberately absent: a reviewer's written comment. The coordinator brief
 * page shows each reviewer's STATUS only — comments are summarised on the
 * decision page, so the API shape used here cannot leak them.
 */

const stageSchema = z.enum(STAGES);
const decisionStatusSchema = z.enum(REVIEW_DECISION_STATUSES);
const reviewModeSchema = z.enum(REVIEW_MODES);

export const coordinatorBriefSummarySchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: stageSchema,
  updatedAt: z.string(),
  pendingAction: z.string(),
});

export const coordinatorBriefListSchema = z.object({
  items: z.array(coordinatorBriefSummarySchema),
});

export const reviewAssignmentSchema = z.object({
  reviewerId: z.string(),
  reviewerName: z.string(),
  mode: reviewModeSchema,
  step: z.number().int().min(1),
  of: z.number().int().min(1),
  decisionStatus: decisionStatusSchema,
  assignedAt: z.string(),
  dueDate: z.string().nullable(),
});

export const reviewPanelSchema = z.object({
  mode: reviewModeSchema,
  requiredReviews: z.number().int().min(0),
  completedReviews: z.number().int().min(0),
  dueDate: z.string().nullable(),
  assignments: z.array(reviewAssignmentSchema),
});

/**
 * When an improvement has been asked for, the coordinator's request metadata.
 * Null on every brief that is not in refinement.
 */
export const refinementRequestSchema = z.object({
  requestedAt: z.string(),
  dueDate: z.string().nullable(),
  requestedBy: z.string().nullable(),
  /** The specific changes asked for, in the order the coordinator listed them. */
  changes: z.array(z.string()).default([]),
  /** The coordinator's written instructions to the applicant. */
  guidance: z.string().nullable().default(null),
  status: z.enum(['open', 'resolved']).default('open'),
});

export const coordinatorBriefSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: stageSchema,
  summary: z.string(),
  purpose: z.string(),
  problemAddressed: z.string(),
  /** The applicant. Distinct from responsibleOfficer, who is the coordinator. */
  submitterName: z.string().nullable(),
  refinement: refinementRequestSchema.nullable().default(null),
  responsibleOfficer: z.string().nullable(),
  assignedSector: z.string().nullable(),
  documentCount: z.number().int().min(0),
  versions: z.number().int().min(1),
  submittedAt: z.string(),
  updatedAt: z.string(),
  outcome: z
    .object({
      status: z.string(),
      reason: z.string().nullable(),
      projectCode: z.string().nullable(),
    })
    .nullable(),
  reviewPanel: reviewPanelSchema,
});

/**
 * A recorded review WITH its written comment — served only by the decision
 * endpoint. Page 1 uses reviewAssignmentSchema above, which has no comment
 * field, so reviewer feedback appears on the decision page and nowhere else.
 */
export const reviewerDecisionSchema = z.object({
  reviewerId: z.string(),
  reviewerName: z.string(),
  step: z.number().int().min(1),
  of: z.number().int().min(1),
  decisionStatus: decisionStatusSchema,
  comment: z.string().nullable(),
  decidedAt: z.string().nullable(),
});

export const decisionViewSchema = z.object({
  brief: coordinatorBriefSchema,
  reviews: z.array(reviewerDecisionSchema),
  canRecordDecision: z.boolean(),
  lockedReason: z.string().nullable(),
});

/** One row of the "Ideas being improved" queue (page 3). Read-only. */
export const improvementCaseSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  submitterName: z.string().nullable(),
  /** Null while the brief is in refinement but the request is not yet written. */
  requestedAt: z.string().nullable(),
  dueDate: z.string().nullable(),
  versions: z.number().int().min(1),
  stage: stageSchema,
});

export const improvementListSchema = z.object({
  items: z.array(improvementCaseSchema),
});

/**
 * Everything the ask-for-changes screen (page 4) needs: the brief, what the
 * reviewers said, the refinement request if one has been written, and the
 * suggested changes offered as a starting checklist.
 */
export const changesViewSchema = z.object({
  brief: coordinatorBriefSchema,
  reviews: z.array(reviewerDecisionSchema),
  refinement: refinementRequestSchema.nullable(),
  suggestedChanges: z.array(z.string()),
  canRequestChanges: z.boolean(),
  blockedReason: z.string().nullable(),
});

export const reviewerOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
});

export const reviewerPoolSchema = z.object({
  items: z.array(reviewerOptionSchema),
});

export const coordinatorApi = {
  briefs: async (token, signal) => {
    const payload = await request('/coordinator/briefs', { token, signal });
    return coordinatorBriefListSchema.parse(payload).items;
  },
  brief: async (token, id, signal) => {
    const payload = await request(`/coordinator/briefs/${encodeURIComponent(id)}`, { token, signal });
    return coordinatorBriefSchema.parse(payload);
  },
  reviewerPool: async (token, signal) => {
    const payload = await request('/coordinator/reviewers', { token, signal });
    return reviewerPoolSchema.parse(payload).items;
  },
  /**
   * body: { reviewerIds: string[], mode, requiredReviews: number, dueDate: string }
   * reviewerIds order is meaningful for sequential reviews (step 1, step 2, …).
   */
  assignReviewers: async (token, id, body) => {
    const payload = await request(`/coordinator/briefs/${encodeURIComponent(id)}/reviewers`, {
      token,
      body,
      method: 'POST',
    });
    return coordinatorBriefSchema.parse(payload);
  },
  improvements: async (token, signal) => {
    const payload = await request('/coordinator/improvements', { token, signal });
    return improvementListSchema.parse(payload).items;
  },
  changesView: async (token, id, signal) => {
    const payload = await request(`/coordinator/briefs/${encodeURIComponent(id)}/changes`, {
      token,
      signal,
    });
    return changesViewSchema.parse(payload);
  },
  /** body: { changes: string[], guidance: string, dueDate: string } */
  saveChangeRequest: async (token, id, body) => {
    const payload = await request(`/coordinator/briefs/${encodeURIComponent(id)}/changes`, {
      token,
      body,
      method: 'POST',
    });
    return changesViewSchema.parse(payload);
  },
  decisionView: async (token, id, signal) => {
    const payload = await request(`/coordinator/briefs/${encodeURIComponent(id)}/decision`, {
      token,
      signal,
    });
    return decisionViewSchema.parse(payload);
  },
  /**
   * body: { outcome: 'confirmed'|'needs_improvement'|'closed', reason: string }
   * The backend decides the resulting stage and generates the project code for
   * a confirmed outcome; the frontend only displays what comes back.
   */
  recordDecision: async (token, id, body) => {
    const payload = await request(`/coordinator/briefs/${encodeURIComponent(id)}/decision`, {
      token,
      body,
      method: 'POST',
    });
    return coordinatorBriefSchema.parse(payload);
  },
};
