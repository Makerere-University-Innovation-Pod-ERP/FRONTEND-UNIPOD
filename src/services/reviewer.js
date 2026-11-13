import { z } from 'zod';
import { request } from './api-client';

/**
 * These endpoints (/reviewer/*) are not yet part of the deployed backend
 * contract — see the note in services/fact-finding.js. This module reads
 * assigned-case summaries for the Reviewer Overview and Review Workspace
 * screens, and exposes the Reviewer Case File's independent decision
 * (Recommended / Changes needed / Not recommended, exactly one required
 * comment, immutable once submitted). It never exposes a
 * reviewer-assignment action — that stays an Innovation Coordinator /
 * Sector Officer action (Assignment 2 / 5's department-intake side).
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

export const reviewerAssignedSchema = z.object({
  items: z.array(reviewerAssignedCaseSchema),
});

export const reviewerCaseSummarySchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  purpose: z.string(),
  problemAddressed: z.string(),
  stage: z.string(),
  documents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  })),
  pendingAction: z.string(),
  decisionStatus: reviewerDecisionStatusSchema,
  comment: z.string().nullable(),
  decidedAt: z.string().nullable(),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(['recommended', 'changes_needed', 'not_recommended']),
  comment: z.string().min(1, 'A comment is required for every decision.'),
});

export const reviewerApi = {
  assigned: async (token, signal) => {
    const payload = await request('/reviewer/assigned', { token, signal });
    return reviewerAssignedSchema.parse(payload).items;
  },
  caseSummary: async (token, id, signal) => {
    const payload = await request(`/reviewer/cases/${encodeURIComponent(id)}`, { token, signal });
    return reviewerCaseSummarySchema.parse(payload);
  },
  submitDecision: async (token, id, body) => {
    const payload = await request(`/reviewer/cases/${encodeURIComponent(id)}/decision`, {
      token,
      body: reviewDecisionSchema.parse(body),
    });
    return reviewerCaseSummarySchema.parse(payload);
  },
};
