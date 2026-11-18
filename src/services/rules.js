import { z } from 'zod';
import { request } from './api-client';

/**
 * Department Rules Manager (Assignment 12). `scope` distinguishes
 * UniPod-wide general rules (owned in spirit by Assignment 1's general
 * rules editor, not yet built) from department-specific ones scoped to a
 * sector (`scopeId` is a sector id from services/backend-api.js's sector
 * CRUD — "department" in this codebase's submission-routing sense).
 */
export const ruleScopeSchema = z.enum(['GENERAL', 'SECTOR']);

export const ruleSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  scope: ruleScopeSchema,
  scopeId: z.string().nullable(),
  mustAccept: z.boolean(),
  version: z.number(),
  published: z.boolean(),
  updatedAt: z.string(),
});

export const rulesApi = {
  async list(token, signal) {
    const data = await request('/rules', { token, signal });
    return z.array(ruleSchema).parse(data);
  },

  async create(body, token, signal) {
    const data = await request('/rules', {
      method: 'POST',
      body,
      token,
      signal,
    });
    return ruleSchema.parse(data);
  },

  async update(id, body, token, signal) {
    const data = await request(`/rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
      token,
      signal,
    });
    return ruleSchema.parse(data);
  },

  async retire(id, token, signal) {
    const data = await request(`/rules/${encodeURIComponent(id)}/retire`, {
      method: 'POST',
      token,
      signal,
    });
    return ruleSchema.parse(data);
  },
};
