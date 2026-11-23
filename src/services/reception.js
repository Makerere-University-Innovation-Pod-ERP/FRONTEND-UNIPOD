import { z } from 'zod';
import { request } from './api-client';

/**
 * Reception (Assignment 3 - Peter Arnold Mukasa).
 *
 * PROPOSED contract - these /reception/* endpoints are NOT on the deployed
 * backend yet. Until they are, MSW serves them from
 * src/mocks/reception-handlers.js (run with VITE_ENABLE_MOCKS=true).
 * Confirm paths and shapes with the backend team before treating as final.
 */

const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['ATTACHED', 'MISSING']),
});

const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean(),
});

const historyEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  by: z.string(),
  action: z.enum(['SUBMITTED', 'COMMENT', 'MISSING_INFO_REQUESTED', 'FORWARDED']),
  destination: z.string().nullable(),
  note: z.string(),
});

const openRequestSchema = z.object({
  items: z.array(z.string()),
  note: z.string(),
  dueDate: z.string(),
  requestedAt: z.string(),
  requestedBy: z.string(),
});

export const briefSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  submitterName: z.string(),
  stage: z.string(),
  submittedAt: z.string(),
  updatedAt: z.string(),
  missingCount: z.number(),
  dueDate: z.string().nullable(),
});

export const receptionHomeSchema = z.object({
  counters: z.object({
    waiting: z.number(),
    missingDocuments: z.number(),
    updatedRecently: z.number(),
  }),
  items: z.array(briefSummarySchema),
});

export const receptionBriefSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  submitter: z.object({
    name: z.string(),
    email: z.string(),
    type: z.enum(['student', 'public', 'organisation']),
  }),
  purpose: z.string(),
  problemAddressed: z.string(),
  suggestedDepartmentId: z.string().nullable(),
  documents: z.array(documentSchema),
  stage: z.string(),
  submittedAt: z.string(),
  updatedAt: z.string(),
  checklist: z.array(checklistItemSchema),
  openRequest: openRequestSchema.nullable(),
  forwardedTo: z.string().nullable(),
  history: z.array(historyEntrySchema),
});

export const departmentSchema = z.object({ id: z.string(), name: z.string() });

export const walkInAccountSchema = z.object({
  submitterId: z.string(),
  fullName: z.string(),
  email: z.string(),
  type: z.enum(['student', 'public', 'organisation']),
  existing: z.boolean(),
});

/** Adds ?q=... to a path only when there is something to search for. */
function withSearch(path, search) {
  const text = (search ?? '').trim();
  return text ? `${path}?${new URLSearchParams({ q: text })}` : path;
}

function briefPath(id, action = '') {
  return `/reception/briefs/${encodeURIComponent(id)}${action}`;
}

export const receptionApi = {
  home: async (token, search, signal) =>
    receptionHomeSchema.parse(await request(withSearch('/reception/briefs', search), { token, signal })),

  missingDocuments: async (token, search, signal) =>
    z.array(briefSummarySchema).parse(
      await request(withSearch('/reception/missing-documents', search), { token, signal }),
    ),

  brief: async (token, id, signal) =>
    receptionBriefSchema.parse(await request(briefPath(id), { token, signal })),

  departments: async (token, signal) =>
    z.array(departmentSchema).parse(await request('/reception/departments', { token, signal })),

  /** body: { note } */
  addComment: async (token, id, body) =>
    receptionBriefSchema.parse(await request(briefPath(id, '/comments'), { token, body })),

  /** body: { items: string[], note, dueDate } */
  askForMissingInfo: async (token, id, body) =>
    receptionBriefSchema.parse(await request(briefPath(id, '/missing-info'), { token, body })),

  /** body: { departmentId, checkedItemIds: string[], comment } */
  forward: async (token, id, body) =>
    receptionBriefSchema.parse(await request(briefPath(id, '/forward'), { token, body })),

  /**
   * Walk-in: finds the person's account by email, or creates a minimal one
   * (QUESTIONS.md, Question 9). body: { type, fullName, email }
   */
  findOrCreateWalkInAccount: async (token, body) =>
    walkInAccountSchema.parse(await request('/reception/walk-in-accounts', { token, body })),

};
