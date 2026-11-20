import { z } from 'zod';
import { request } from './api-client';

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  createdAt: z.string(),
  readAt: z.string().nullable().optional(),
  read: z.boolean(),
  link: z.string().optional(),
}).transform((item) => ({
  ...item,
  body: item.body ?? '',
  link: item.link ?? notificationLink(item.entityType),
}));

const notificationPageSchema = z.object({
  items: z.array(notificationSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const unreadCountSchema = z.object({ unread: z.number().int().nonnegative() });
const markAllReadSchema = z.object({ marked: z.number().int().nonnegative() });
const pushConfigurationSchema = z.object({
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
});
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const notificationsApi = {
  list: async (token, { page = 0, size = 25 } = {}, signal) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const payload = await request(`/notifications?${params}`, { token, signal });
    return notificationPageSchema.parse(payload);
  },
  unreadCount: async (token, signal) => (
    unreadCountSchema.parse(await request('/notifications/unread-count', { token, signal }))
  ),
  markRead: async (id, token) => {
    return notificationSchema.parse(await request(`/notifications/${encodeURIComponent(id)}/read`, {
      token,
      method: 'POST',
    }));
  },
  markAllRead: async (token) => (
    markAllReadSchema.parse(await request('/notifications/read-all', { token, method: 'POST' }))
  ),
  pushConfiguration: async (token, signal) => (
    pushConfigurationSchema.parse(await request('/notifications/push/config', { token, signal }))
  ),
  registerPushSubscription: async (token, subscription) => {
    const parsed = pushSubscriptionSchema.parse(subscription);
    await request('/notifications/push/subscriptions', {
      token,
      method: 'PUT',
      body: {
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
      },
    });
  },
  removePushSubscription: async (token, endpoint) => {
    const params = new URLSearchParams({ endpoint });
    await request(`/notifications/push/subscriptions?${params}`, { token, method: 'DELETE' });
  },
};

function notificationLink(entityType) {
  switch (entityType?.toLowerCase()) {
    case 'booking':
      return '/my-submissions/bookings';
    case 'invoice':
      return '/my-submissions/invoices';
    case 'submission':
      return '/my-submissions';
    default:
      return '/overview';
  }
}
