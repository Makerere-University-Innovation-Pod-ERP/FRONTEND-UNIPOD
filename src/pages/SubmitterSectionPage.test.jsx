import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import {
  resetNotificationMocks,
  resetSubmitterBookingMocks,
  resetSubmitterInvoiceMocks,
} from '@/mocks/handlers';
import { makeMockToken } from '@/mocks/jwt';
import { notificationsApi } from '@/services/notifications';
import {
  SubmitterBookingsPage,
  SubmitterInvoicesPage,
  SubmitterServiceRequestsPage,
} from './SubmitterSectionPage';

beforeEach(() => {
  resetSubmitterBookingMocks();
  resetSubmitterInvoiceMocks();
  resetNotificationMocks();
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

function renderPage(Page, token = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test')) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <>
        <Page token={token} onUnauthorized={() => {}} />
        <Toaster position="top-right" />
      </>
    </QueryClientProvider>,
  );
}

describe('Submitter section pages', () => {
  it.each([
    [SubmitterServiceRequestsPage, 'Service requests', 'requests', 'Your service requests'],
    [SubmitterInvoicesPage, 'Invoices and payments', 'payments', 'Your invoices'],
    [SubmitterBookingsPage, 'Bookings', 'bookings', 'Your bookings'],
  ])('renders %s as a standalone workspace', (Page, title, variant, recordsTitle) => {
    const { container } = renderPage(Page);

    expect(screen.getByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
    expect(container.querySelector('.submitter-hub')).toHaveClass(`submitter-hub--${variant}`);
    expect(screen.getByRole('heading', { name: recordsTitle })).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });

  it('omits the Quick Guide from the bookings page', () => {
    renderPage(SubmitterBookingsPage);

    expect(screen.queryByText('QUICK GUIDE')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Make your visit count' })).not.toBeInTheDocument();
  });

  it('loads the submitter bookings and shows server details on demand', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterBookingsPage);

    expect(await screen.findByText('BKG-2026-001201')).toBeInTheDocument();
    const booking = screen.getByText('BKG-2026-001201').closest('article');
    await user.click(within(booking).getByRole('button', { name: 'Booking details' }));

    expect(await within(booking).findByText('Contact / operator')).toBeInTheDocument();
    expect(within(booking).getByText('Brian S.')).toBeInTheDocument();
  });

  it('opens the exact booking linked by a notification', async () => {
    window.history.replaceState({}, '', '/my-submissions/bookings?booking=00000000-0000-4000-8000-000000000301');
    renderPage(SubmitterBookingsPage);

    const reference = await screen.findByText('BKG-2026-001201');
    const booking = reference.closest('[data-notification-target="true"]');
    expect(booking).not.toBeNull();
    expect(await within(booking).findByText('Contact / operator')).toBeInTheDocument();
    expect(within(booking).getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('filters facilities by typing and only selects a listed facility', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterBookingsPage);
    await screen.findByText('BKG-2026-001201');

    const facility = screen.getByRole('combobox', { name: 'Facility' });
    await user.type(facility, 'Podcast');

    expect(await screen.findByRole('option', { name: /Podcast Studio/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Multimedia Studio A/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Podcast Studio/ }));
    expect(facility).toHaveValue('Podcast Studio');
  });

  it('opens the rounded calendar popover and updates the chosen booking date', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterBookingsPage);
    const dateButton = screen.getByRole('button', { name: 'Booking date' });
    const initialDate = dateButton.textContent;

    await user.click(dateButton);
    const calendar = await screen.findByRole('dialog', { name: 'Choose booking date' });
    expect(calendar).toHaveClass('submitter-booking-calendar');
    const availableDays = [...calendar.querySelectorAll('.rdp-day_button:not(:disabled)')];
    expect(availableDays.length).toBeGreaterThan(0);
    await user.click(availableDays[availableDays.length - 1]);

    expect(screen.queryByRole('dialog', { name: 'Choose booking date' })).not.toBeInTheDocument();
    expect(dateButton).not.toHaveTextContent(initialDate);
  });

  it('creates a submitter booking and refreshes the personal booking list', async () => {
    const user = userEvent.setup();
    const token = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test');
    renderPage(SubmitterBookingsPage, token);

    await screen.findByText('BKG-2026-001201');
    const facility = screen.getByRole('combobox', { name: 'Facility' });
    await user.type(facility, 'Podcast');
    await user.click(await screen.findByRole('option', { name: /Podcast Studio/ }));
    await user.clear(screen.getByLabelText('Purpose'));
    await user.type(screen.getByLabelText('Purpose'), 'Prototype demo');
    await user.click(screen.getByRole('button', { name: 'Request booking' }));

    expect(await screen.findByText('Request BKG-2026-001202 was submitted and is awaiting review.')).toBeInTheDocument();
    expect(await screen.findByText('Booking request submitted')).toBeInTheDocument();
    expect(await screen.findByText('Prototype demo')).toBeInTheDocument();
    const notificationPage = await notificationsApi.list(token);
    expect(notificationPage.items[0]).toMatchObject({
      type: 'BOOKING_REQUESTED',
      title: 'Booking request received: BKG-2026-001202',
      link: '/my-submissions/bookings?booking=00000000-0000-4000-8000-000000001202',
      read: false,
    });
  });

  it('cancels a pending booking through the submitter endpoint', async () => {
    const user = userEvent.setup();
    const token = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test');
    renderPage(SubmitterBookingsPage, token);

    const reference = await screen.findByText('BKG-2026-001201');
    const booking = reference.closest('article');
    await user.click(within(booking).getByRole('button', { name: 'Cancel booking' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel this booking?' });
    expect(dialog).toHaveTextContent('Are you sure you want to cancel BKG-2026-001201 for Podcast Studio?');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm cancellation' }));

    expect(await screen.findByText('Booking BKG-2026-001201 was cancelled.')).toBeInTheDocument();
    expect(await screen.findByText('Booking cancelled')).toBeInTheDocument();
    expect(await within(booking).findByText('Cancelled')).toBeInTheDocument();
    expect(within(booking).queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    const notificationPage = await notificationsApi.list(token);
    expect(notificationPage.items[0]).toMatchObject({
      type: 'BOOKING_CANCELLED',
      title: 'Booking cancelled: BKG-2026-001201',
      link: '/my-submissions/bookings?booking=00000000-0000-4000-8000-000000000301',
      read: false,
    });
  });

  it('keeps the booking when cancellation is dismissed from the confirmation dialog', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterBookingsPage);

    const reference = await screen.findByText('BKG-2026-001201');
    const booking = reference.closest('article');
    await user.click(within(booking).getByRole('button', { name: 'Cancel booking' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel this booking?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep booking' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(within(booking).getByText('Awaiting review')).toBeInTheDocument();
    expect(within(booking).getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('lists only submitter invoices and filters them using the submitter endpoint', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterInvoicesPage);

    expect(await screen.findByText('INV-2026-201')).toBeInTheDocument();
    expect(screen.getByText('UGX 40,000')).toBeInTheDocument();
    expect(screen.queryByText('INV-2026-114')).not.toBeInTheDocument();
    expect(screen.queryByText('QUICK GUIDE')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Keep payments in order' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter invoices by status' }), 'WAITING_FOR_CHECK');

    expect(await screen.findByText('INV-2026-198')).toBeInTheDocument();
    expect(screen.queryByText('INV-2026-201')).not.toBeInTheDocument();
  });

  it('submits payment evidence and refreshes the invoice status', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterInvoicesPage);

    await user.click(await screen.findByRole('button', { name: 'Upload payment proof' }));
    await user.type(screen.getByLabelText('Payment reference'), 'MOBILE-REF-2026-119');
    await user.upload(
      screen.getByLabelText('Proof document'),
      new File(['payment proof'], 'payment-proof.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit payment proof' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Payment proof submitted for INV-2026-201.');
    const updatedInvoice = screen.getByText('INV-2026-201').closest('article');
    expect(await within(updatedInvoice).findByText('Payment evidence under review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload payment proof' })).not.toBeInTheDocument();
  });

  it('blocks payment evidence when its amount does not match the invoice', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterInvoicesPage);

    await user.click(await screen.findByRole('button', { name: 'Upload payment proof' }));
    await user.type(screen.getByLabelText('Payment reference'), 'MOBILE-REF-2026-120');
    await user.clear(screen.getByLabelText('Amount paid (UGX)'));
    await user.type(screen.getByLabelText('Amount paid (UGX)'), '1');
    await user.upload(
      screen.getByLabelText('Proof document'),
      new File(['payment proof'], 'payment-proof.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit payment proof' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The payment amount must match this invoice: UGX 40,000.');
    expect(screen.queryByText('Payment proof submitted for INV-2026-201.')).not.toBeInTheDocument();
  });

  it('loads receipt metadata for an issued receipt', async () => {
    const user = userEvent.setup();
    renderPage(SubmitterInvoicesPage);

    const detailsButtons = await screen.findAllByRole('button', { name: 'Invoice details' });
    await user.click(within(screen.getByText('INV-2026-184').closest('article')).getByRole('button', { name: 'Invoice details' }));

    expect(await screen.findByText('REC-2026-094')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download receipt PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Printable receipt' })).toBeInTheDocument();
  });
});
