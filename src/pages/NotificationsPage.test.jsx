import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { resetNotificationMocks } from '@/mocks/handlers';
import { notificationsApi } from '@/services/notifications';
import { NotificationsPage } from './NotificationsPage';

const TOKEN = 'test-token';

function renderPage(roles = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/notifications']}>
        <NotificationsPage token={TOKEN} roles={roles} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetNotificationMocks();
});

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
});
