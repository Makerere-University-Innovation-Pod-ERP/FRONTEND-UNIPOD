import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from './api-client';
import { notificationsApi } from './notifications';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('notifications API', () => {
  it('reads the signed-in user notification page and maps booking notices to the bookings screen', async () => {
    const notification = {
      id: '00000000-0000-4000-8000-000000000701',
      type: 'BOOKING_REQUESTED',
      title: 'Booking request received: BKG-2026-001202',
      body: null,
      entityType: 'booking',
      entityId: '00000000-0000-4000-8000-000000001202',
      createdAt: '2026-11-19T08:00:00Z',
      readAt: null,
      read: false,
    };
    const fetchMock = vi.fn(async (url, options) => {
      expect(new URL(url).pathname).toBe(`${new URL(API_BASE_URL).pathname}/notifications`);
      expect(new URL(url).search).toBe('?page=0&size=25');
      expect(options.headers.get('Authorization')).toBe('Bearer submitter-token');
      return jsonResponse({
        items: [notification],
        page: 0,
        size: 25,
        totalElements: 1,
        totalPages: 1,
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const page = await notificationsApi.list('submitter-token');

    expect(page.items[0]).toMatchObject({
      ...notification,
      body: '',
      link: '/my-submissions/bookings',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('links invoice and submission notifications to the related workspace pages', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      items: [
        {
          id: 'invoice-notification',
          type: 'PAYMENT_CONFIRMED',
          title: 'Invoice paid',
          entityType: 'invoice',
          createdAt: '2026-11-19T08:00:00Z',
          read: false,
        },
        {
          id: 'submission-notification',
          type: 'DOCUMENT_REQUESTED',
          title: 'Document requested',
          entityType: 'submission',
          createdAt: '2026-11-19T08:00:00Z',
          read: false,
        },
      ],
      page: 0,
      size: 25,
      totalElements: 2,
      totalPages: 1,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const page = await notificationsApi.list('submitter-token');

    expect(page.items.map(({ link }) => link)).toEqual([
      '/my-submissions/invoices',
      '/my-submissions',
    ]);
  });

  it('reads the unread count and persists both single and bulk read updates', async () => {
    const notification = {
      id: '00000000-0000-4000-8000-000000000701',
      type: 'BOOKING_APPROVED',
      title: 'Booking approved',
      body: 'Your booking was approved.',
      entityType: 'booking',
      entityId: '00000000-0000-4000-8000-000000001202',
      createdAt: '2026-11-19T08:00:00Z',
      readAt: '2026-11-19T09:00:00Z',
      read: true,
    };
    const fetchMock = vi.fn(async (url, options) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith('/notifications/unread-count')) return jsonResponse({ unread: 2 });
      if (pathname.endsWith('/notifications/read-all')) return jsonResponse({ marked: 2 });
      if (pathname.endsWith('/notifications/00000000-0000-4000-8000-000000000701/read')) {
        expect(options.method).toBe('POST');
        return jsonResponse(notification);
      }
      throw new Error(`Unexpected notification request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(await notificationsApi.unreadCount('submitter-token')).toEqual({ unread: 2 });
    expect(await notificationsApi.markRead(notification.id, 'submitter-token')).toMatchObject({
      read: true,
      link: '/my-submissions/bookings',
    });
    expect(await notificationsApi.markAllRead('submitter-token')).toEqual({ marked: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('loads the VAPID configuration and registers or removes the signed-in browser subscription', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/subscription-token';
    const subscription = {
      endpoint,
      keys: { p256dh: 'public-subscription-key', auth: 'subscription-auth-key' },
    };
    const fetchMock = vi.fn(async (url, options) => {
      const { pathname, searchParams } = new URL(url);
      expect(options.headers.get('Authorization')).toBe('Bearer submitter-token');
      if (pathname.endsWith('/notifications/push/config')) {
        return jsonResponse({ enabled: true, publicKey: 'server-public-key' });
      }
      if (pathname.endsWith('/notifications/push/subscriptions') && options.method === 'PUT') {
        expect(JSON.parse(options.body)).toEqual({
          endpoint,
          p256dh: 'public-subscription-key',
          auth: 'subscription-auth-key',
        });
        return emptyResponse();
      }
      if (pathname.endsWith('/notifications/push/subscriptions') && options.method === 'DELETE') {
        expect(searchParams.get('endpoint')).toBe(endpoint);
        return emptyResponse();
      }
      throw new Error(`Unexpected notification request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(await notificationsApi.pushConfiguration('submitter-token')).toEqual({
      enabled: true,
      publicKey: 'server-public-key',
    });
    await notificationsApi.registerPushSubscription('submitter-token', subscription);
    await notificationsApi.removePushSubscription('submitter-token', endpoint);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

function jsonResponse(data) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
  };
}

function emptyResponse() {
  return {
    ok: true,
    status: 204,
    headers: new Headers(),
  };
}
