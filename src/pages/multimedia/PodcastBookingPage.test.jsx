import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PodcastBookingPage } from './PodcastBookingPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PodcastBookingPage token="test-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function local(isoUtc) {
  const d = new Date(isoUtc);
  const pad = (n) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

async function fillSlot(user, { date, start, end }) {
  await screen.findByRole('option', { name: 'Podcast Studio' });
  await user.selectOptions(screen.getByLabelText(/^studio/i), 'fac-podcast');
  fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: date } });
  fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: start } });
  fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: end } });
  await user.type(screen.getByLabelText(/show name/i), 'Listener Q&A');
  await user.type(screen.getByLabelText(/who is taking part/i), 'Joan Nakazzi, Arthur Kanyike');
  await user.type(screen.getByLabelText(/producer/i), 'Katia Birungi');
}

describe('PodcastBookingPage', () => {
  it('lists upcoming studio bookings', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: /book a podcast slot/i })).toBeInTheDocument();
    expect(await screen.findByText(/Innovation Spotlight Ep\.13/i)).toBeInTheDocument();
  });

  it('warns about a clash with an existing booking and blocks the request', async () => {
    const user = userEvent.setup();
    renderPage();
    const start = local('2027-01-20T07:30:00Z');
    const end = local('2027-01-20T08:30:00Z');
    await fillSlot(user, { date: start.date, start: start.time, end: end.time });
    expect(await screen.findByRole('alert')).toHaveTextContent(/clashes with BKG-2026-000101/i);
    expect(screen.getByRole('button', { name: /request booking/i })).toBeDisabled();
  });

  it('warns when a class is scheduled in the studio', async () => {
    const user = userEvent.setup();
    renderPage();
    const start = local('2027-01-21T07:30:00Z');
    const end = local('2027-01-21T08:30:00Z');
    await fillSlot(user, { date: start.date, start: start.time, end: end.time });
    expect(await screen.findByRole('alert')).toHaveTextContent(/a class is scheduled/i);
  });

  it('requests a slot that does not clash', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillSlot(user, { date: '2027-01-25', start: '09:00', end: '10:00' });
    await user.click(screen.getByRole('button', { name: /request booking/i }));
    expect(await screen.findByText(/waiting for approval/i)).toBeInTheDocument();
  });
});
