import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { resetNotificationMocks } from '@/mocks/handlers';
import { ApiError } from '@/services/api-client';
import { notificationsApi } from '@/services/notifications';
import { NotificationsPage } from './NotificationsPage';

const TOKEN = 'test-token';
let originalServiceWorkerDescriptor;

function renderPage(roles = [], onUnauthorized = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/notifications']}>
        <NotificationsPage token={TOKEN} roles={roles} onUnauthorized={onUnauthorized} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  vi.restoreAllMocks();
  resetNotificationMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalServiceWorkerDescriptor) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorkerDescriptor);
  } else {
    delete navigator.serviceWorker;
  }
});

function enablePushBrowser(subscription) {
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('Notification', { permission: 'granted' });
  vi.stubGlobal('PushManager', class PushManager {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) },
      }),
    },
  });
}

describe('NotificationsPage', () => {
  it('shows notification activity and filters to unread items', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Fact-finding assessment needed')).toBeInTheDocument();
    expect(screen.getByText('Refinement resolved')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /unread/i }));

    expect(await screen.findByText('Fact-finding assessment needed')).toBeInTheDocument();
    expect(screen.queryByText('Refinement resolved')).not.toBeInTheDocument();
  });

  it('marks a notification read and refreshes the unread count', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', {
      name: 'Mark as read: Fact-finding assessment needed',
    }));

    await waitFor(() => {
      expect(screen.queryByRole('button', {
        name: 'Mark as read: Fact-finding assessment needed',
      })).not.toBeInTheDocument();
      expect(screen.getByText('1 unread')).toBeInTheDocument();
    });
  });

  it('marks all notifications read', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /mark all read/i }));

    await waitFor(() => {
      expect(screen.getByText('0 unread')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled();
    });
  });

  it('hides booking notifications from non-submitter accounts', async () => {
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({
      items: [
        {
          id: 'booking-notice',
          type: 'BOOKING_REQUESTED',
          title: 'Booking request received',
          body: 'Your request is pending.',
          entityType: 'booking',
          entityId: 'booking-1',
          createdAt: '2026-11-20T09:00:00Z',
          readAt: null,
          read: false,
          link: '/my-submissions/bookings',
        },
        {
          id: 'review-notice',
          type: 'REVIEWER_ASSIGNED',
          title: 'New case assigned',
          body: 'A case is ready for review.',
          entityType: 'submission',
          entityId: 'submission-1',
          createdAt: '2026-11-20T08:00:00Z',
          readAt: null,
          read: false,
          link: '/reviewer/workspace',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    });

    renderPage(['ROLE_ADMINISTRATOR']);

    expect(await screen.findByText('New case assigned')).toBeInTheDocument();
    expect(screen.queryByText('Booking request received')).not.toBeInTheDocument();
  });

  it('logs out when the notifications API reports an expired session', async () => {
    const onUnauthorized = vi.fn();
    vi.spyOn(notificationsApi, 'list').mockRejectedValue(new ApiError('Session expired', 401));
    vi.spyOn(notificationsApi, 'unreadCount').mockRejectedValue(new ApiError('Session expired', 401));

    renderPage([], onUnauthorized);

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load your notifications.');
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });

  it('handles notification endpoints that are not deployed without offering a futile retry', async () => {
    vi.spyOn(notificationsApi, 'list').mockRejectedValue(new ApiError('Not found', 404));
    vi.spyOn(notificationsApi, 'unreadCount').mockRejectedValue(new ApiError('Not found', 404));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Notifications are not available for this workspace yet.',
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('reflects push registration only after backend success and removes the account link on session cleanup', async () => {
    const subscription = {
      endpoint: 'https://push.example.test/subscription',
      toJSON: () => ({
        endpoint: 'https://push.example.test/subscription',
        keys: { p256dh: 'public-key', auth: 'auth-key' },
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    enablePushBrowser(subscription);
    vi.spyOn(notificationsApi, 'pushConfiguration').mockResolvedValue({
      enabled: true,
      publicKey: 'server-public-key',
    });
    const register = vi.spyOn(notificationsApi, 'registerPushSubscription').mockResolvedValue(undefined);
    const remove = vi.spyOn(notificationsApi, 'removePushSubscription').mockResolvedValue(undefined);

    const { unmount } = renderPage();

    expect(await screen.findByText('You are set to receive alerts on this browser.')).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith(TOKEN, expect.objectContaining({
      endpoint: subscription.endpoint,
    }));

    unmount();
    await waitFor(() => expect(remove).toHaveBeenCalledWith(TOKEN, subscription.endpoint));
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('does not show push alerts as enabled when backend registration fails', async () => {
    const subscription = {
      endpoint: 'https://push.example.test/subscription',
      toJSON: () => ({
        endpoint: 'https://push.example.test/subscription',
        keys: { p256dh: 'public-key', auth: 'auth-key' },
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    enablePushBrowser(subscription);
    vi.spyOn(notificationsApi, 'pushConfiguration').mockResolvedValue({
      enabled: true,
      publicKey: 'server-public-key',
    });
    vi.spyOn(notificationsApi, 'registerPushSubscription').mockRejectedValue(
      new ApiError('Subscription registration failed.', 503),
    );
    vi.spyOn(notificationsApi, 'removePushSubscription').mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Subscription registration failed.');
    expect(screen.getByRole('button', { name: 'Enable browser alerts' })).toBeInTheDocument();
    expect(screen.queryByText('You are set to receive alerts on this browser.')).not.toBeInTheDocument();
  });
});
