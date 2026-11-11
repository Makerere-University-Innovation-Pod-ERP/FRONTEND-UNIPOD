import { z } from 'zod';
import { request } from './api-client';

export const mediaStatusSchema = z.enum([
  'REQUESTED',
  'SCHEDULED',
  'IN_PRODUCTION',
  'DELIVERED',
]);

export const mediaRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  studio: z.string().nullable().optional(),
  assignee: z.string(),
  status: mediaStatusSchema,
  date: z.string().optional(),
  description: z.string().optional(),
});

export const mediaOverviewSchema = z.object({
  requestedCount: z.number(),
  scheduledCount: z.number(),
  inProductionCount: z.number(),
  deliveredCount: z.number(),
  requests: z.array(mediaRequestSchema),
});

export const mediaApi = {
  async getOverview(token, signal) {
    const data = await request('/operations/media/overview', { token, signal });
    return mediaOverviewSchema.parse(data);
  },

  async getRequests(token, signal) {
    const data = await request('/operations/media/requests', { token, signal });
    return z.array(mediaRequestSchema).parse(data);
  },

  async updateRequestStatus(id, status, token, signal) {
    const data = await request(`/operations/media/requests/${id}/status`, {
      token,
      signal,
      method: 'PATCH',
      body: { status },
    });
    return mediaRequestSchema.parse(data);
  },
};
