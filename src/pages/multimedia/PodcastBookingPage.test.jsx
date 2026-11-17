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
        <PodcastBookingPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PodcastBookingPage', () => {
  it('renders the existing bookings', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /book a podcast slot/i })).toBeInTheDocument();
    expect(await screen.findByText(/Innovation Spotlight Ep\.13/i)).toBeInTheDocument();
  });

  it('warns about a clash and blocks submission when the chosen slot overlaps an existing booking', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/Innovation Spotlight Ep\.13/i);
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:30' } });
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '11:00' } });
    await user.type(screen.getByLabelText(/purpose/i), 'Overlapping recording');
    await user.type(screen.getByLabelText(/producer/i), 'Katia Birungi');

    expect(await screen.findByRole('alert')).toHaveTextContent(/clashes with an existing booking/i);
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled();
  });

  it('books a slot that does not clash', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/Innovation Spotlight Ep\.13/i);
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2026-11-25' } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });
    await user.type(screen.getByLabelText(/purpose/i), 'New listener Q&A');
    await user.type(screen.getByLabelText(/producer/i), 'Katia Birungi');
    await user.type(screen.getByLabelText(/booked by/i), 'Namulinde Jean Madrine');
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    expect(await screen.findByText(/booked: new listener q&a/i)).toBeInTheDocument();
  });
});
