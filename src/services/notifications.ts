import { z } from 'zod';
import { request } from './api-client';

/**
 * FR-026 (notifications) is listed in the team assignment doc as a shared
 * topbar entry point whose API contract is not yet confirmed with the
 * backend team ("Items requiring project-owner confirmation"). This module
 * proposes a conventional REST shape. Against the real backend (no such
 * endpoint deployed yet) requests fail and the shell shows a quiet empty
 * state rather than an error banner — see useNotifications.
 */

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
});
export type AppNotification = z.infer<typeof notificationSchema>;

const notificationListSchema = z.object({ items: z.array(notificationSchema) });

export const notificationsApi = {
  list: async (token: string, signal?: AbortSignal) => {
    const payload = await request<unknown>('/notifications', { token, signal });
    return notificationListSchema.parse(payload).items;
  },
  markAllRead: (token: string) => request<void>('/notifications/read-all', { token, method: 'POST' }),
};
