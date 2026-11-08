import { z } from 'zod';
import { request } from './api-client';

/**
 * These endpoints (/reviewer/*) are not yet part of the deployed backend
 * contract — see the note in services/fact-finding.ts. The Reviewer Case
 * File (the decision form: Recommended / Changes needed / Not recommended)
 * belongs to Assignment 5 (Kasibante Taufic Larry); this module only reads
 * assigned-case summaries for the Reviewer Overview and Review Workspace
 * screens and never exposes a reviewer-assignment action.
 */

export const reviewerAssignedCaseSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: z.string(),
  assignedAt: z.string(),
  pendingAction: z.string(),
  decisionStatus: z.enum(['pending', 'recommended', 'changes_needed', 'not_recommended']),
});
export type ReviewerAssignedCase = z.infer<typeof reviewerAssignedCaseSchema>;

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
  decisionStatus: reviewerAssignedCaseSchema.shape.decisionStatus,
});
export type ReviewerCaseSummary = z.infer<typeof reviewerCaseSummarySchema>;

export const reviewerApi = {
  assigned: async (token: string, signal?: AbortSignal) => {
    const payload = await request<unknown>('/reviewer/assigned', { token, signal });
    return reviewerAssignedSchema.parse(payload).items;
  },
  caseSummary: async (token: string, id: string, signal?: AbortSignal) => {
    const payload = await request<unknown>(`/reviewer/cases/${encodeURIComponent(id)}`, { token, signal });
    return reviewerCaseSummarySchema.parse(payload);
  },
};
