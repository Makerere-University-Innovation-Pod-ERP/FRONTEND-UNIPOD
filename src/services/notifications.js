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
  link: z.string().nullable().optional(),
}).transform((item) => ({
  ...item,
  body: item.body ?? '',
  link: item.link ?? notificationLink(item.entityType, item.entityId),
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
  list: async (token, { page = 0, size = 25, unread = false } = {}, signal) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (unread) params.set('unread', 'true');
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

export function notificationLink(entityType, entityId) {
  const id = entityId ? encodeURIComponent(entityId) : '';
  switch (entityType?.toLowerCase()) {
    case 'booking':
      return id ? `/my-submissions/bookings?booking=${id}` : '/my-submissions/bookings';
    case 'invoice':
      return id ? `/my-submissions/invoices?invoice=${id}` : '/my-submissions/invoices';
    case 'submission':
      return id ? `/submissions/${id}` : '/my-submissions';
    case 'equipment_loan':
      return id ? `/telecoms/equipment/lending?loan=${id}` : '/telecoms/equipment/lending';
    case 'equipment_item':
    case 'stock_item':
    case 'machine':
      return id ? `/notifications/open/${entityType.toLowerCase()}/${id}` : '/';
    case 'partner':
      return id ? `/partners?partner=${id}` : '/partners';
    case 'media_request':
      return id ? `/my-submissions/media/${id}` : '/my-submissions/service-requests';
    default:
      return '/';
  }
}

export function notificationTarget(item, roles = []) {
  if (item.entityType?.toLowerCase() === 'invoice'
    && !roles.includes('ROLE_SUBMITTER')
    && item.entityId) {
    return `/finance/invoices?invoice=${encodeURIComponent(item.entityId)}`;
  }
  if (item.entityType?.toLowerCase() === 'media_request'
    && !roles.includes('ROLE_SUBMITTER')
    && item.entityId) {
    return `/multimedia/media?request=${encodeURIComponent(item.entityId)}`;
  }
  return item.link ?? notificationLink(item.entityType, item.entityId);
}
