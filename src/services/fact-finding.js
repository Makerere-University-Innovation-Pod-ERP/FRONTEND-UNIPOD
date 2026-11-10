import { z } from 'zod';
import { request } from './api-client';

/**
 * These endpoints (/fact-finding/*) are not yet part of the deployed
 * backend contract. They follow the existing backend's path/response
 * conventions (see services/backend-api.ts) and the candidate fact-finding
 * workflow in the SRS (§8, FR-008/FR-009/FR-012). Confirm with the backend
 * team before treating this as final — see MSW handlers in src/mocks for
 * the mock implementation used until then.
 */

export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean(),
  note: z.string(),
});

export const factFindingQueueItemSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: z.string(),
  receivedAt: z.string().nullable(),
  updatedAt: z.string(),
  reason: z.string(),
});

export const factFindingQueueSchema = z.object({
  items: z.array(factFindingQueueItemSchema),
});

export const factFindingCaseSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  purpose: z.string(),
  problemAddressed: z.string(),
  stage: z.string(),
  receivedAt: z.string().nullable(),
  updatedAt: z.string(),
  documents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    createdAt: z.string().nullable(),
  })),
  stageHistory: z.array(z.object({
    toStage: z.string(),
    changedBy: z.string(),
    changedAt: z.string(),
    note: z.string().nullable(),
  })),
  checklist: z.array(checklistItemSchema),
  assessment: z.string().default(''),
  nextAction: z.object({
    recommendation: z.string(),
    options: z.array(z.string()),
  }),
});

export const defaultChecklist = () => [
  { id: 'title', label: 'Title is clear', checked: false, note: '' },
  { id: 'purpose', label: 'Purpose is defined', checked: false, note: '' },
  { id: 'evidence', label: 'Evidence is adequate', checked: false, note: '' },
  { id: 'category', label: 'Category is correct', checked: false, note: '' },
  { id: 'documents', label: 'Required documents present', checked: false, note: '' },
];

export const factFindingApi = {
  queue: async (token, signal) => {
    const payload = await request('/fact-finding/queue', { token, signal });
    return factFindingQueueSchema.parse(payload).items;
  },
  caseFile: async (token, id, signal) => {
    const payload = await request(`/fact-finding/cases/${encodeURIComponent(id)}`, { token, signal });
    return factFindingCaseSchema.parse(payload);
  },
  saveAssessment: async (token, id, body) => {
    const payload = await request(`/fact-finding/cases/${encodeURIComponent(id)}/assessment`, {
      token,
      body,
    });
    return factFindingCaseSchema.parse(payload);
  },
};
