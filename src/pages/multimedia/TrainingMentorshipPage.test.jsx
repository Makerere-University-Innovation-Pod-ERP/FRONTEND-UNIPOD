import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TrainingMentorshipPage } from './TrainingMentorshipPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TrainingMentorshipPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TrainingMentorshipPage', () => {
  it('renders page heading, description, and the 3 KPI metric cards', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /training & mentorship/i })).toBeInTheDocument();
    expect(screen.getByText(/published sessions, registration capacity and mentorship follow-ups/i)).toBeInTheDocument();

    expect(await screen.findByText('UPCOMING SESSIONS')).toBeInTheDocument();
    expect(screen.getByText('SEATS FILLED')).toBeInTheDocument();
    expect(screen.getByText('MENTORSHIP FOLLOW-UPS')).toBeInTheDocument();
  });

  it('renders the session rows from the real fixture data', async () => {
    renderPage();

    expect(await screen.findByText('Intro to CNC Safety')).toBeInTheDocument();
    expect(screen.getByText('Robinson Mugisha')).toBeInTheDocument();
    expect(screen.getByText('14/18')).toBeInTheDocument();

    expect(screen.getByText('Telecom Systems Bootcamp')).toBeInTheDocument();
    expect(screen.getByText('Startup Pitch Clinic')).toBeInTheDocument();
    expect(screen.getByText('Media Production Fundamentals')).toBeInTheDocument();
  });

  it('opens a session and shows its venue, not a stale "location" field', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByTestId('session-row-ts-1'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/FabLab CNC Workshop/)).toBeInTheDocument();
  });

  it('creates a new session through the New session form', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /new session/i }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/title/i), 'Podcast Mixing Workshop');
    await user.type(within(dialog).getByLabelText(/facilitator/i), 'Katia Birungi');
    await user.type(within(dialog).getByLabelText(/date & time/i), '10 Nov · 14:00');
    await user.type(within(dialog).getByLabelText(/venue/i), 'Multimedia Studio A');
    await user.click(within(dialog).getByRole('button', { name: /create session/i }));

    expect(await screen.findByText('Podcast Mixing Workshop')).toBeInTheDocument();
  });

  it('blocks session creation until the required fields are filled', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /new session/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /create session/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/required/i);
  });
});
