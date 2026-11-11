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

export const coordinatorBriefSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: stageSchema,
  summary: z.string(),
  purpose: z.string(),
  problemAddressed: z.string(),
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
};
