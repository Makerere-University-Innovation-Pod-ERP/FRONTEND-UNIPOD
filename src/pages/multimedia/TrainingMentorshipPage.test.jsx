import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TrainingMentorshipPage } from './TrainingMentorshipPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TrainingMentorshipPage token="test-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TrainingMentorshipPage', () => {
  it('renders the heading and the 3 KPI cards', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: /training & mentorship/i })).toBeInTheDocument();
    expect(screen.getByText('UPCOMING SESSIONS')).toBeInTheDocument();
    expect(screen.getByText('SEATS FILLED')).toBeInTheDocument();
    expect(screen.getByText('MENTORSHIP FOLLOW-UPS')).toBeInTheDocument();
  });

  it('lists sessions from the overview with their fee', async () => {
    renderPage();
    const row = await screen.findByTestId('session-row-ts-1');
    expect(within(row).getByText('Intro to CNC Safety')).toBeInTheDocument();
    expect(within(row).getByText('UGX 60,000')).toBeInTheDocument();
    expect(within(screen.getByTestId('session-row-ts-2')).getByText('Free')).toBeInTheDocument();
  });

  it('keeps a paid seat pending until payment is confirmed, then allows attendance', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('session-row-ts-1'));
    const dialog = await screen.findByRole('dialog');

    const pending = within(dialog).getByTestId('participant-p-1');
    expect(within(pending).getByText('Pending payment')).toBeInTheDocument();
    expect(within(pending).getByLabelText(/attendance for daniel kato/i)).toBeDisabled();

    await user.click(within(pending).getByRole('button', { name: /confirm payment/i }));

    expect(await within(dialog).findByText('Confirmed', { selector: '[data-testid="participant-p-1"] *' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/attendance for daniel kato/i)).toBeEnabled();
  });

  it('signs up a participant on a free session as confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('session-row-ts-2'));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/full name/i), 'Joan Nakazzi');
    await user.type(within(dialog).getByLabelText(/registration number/i), 'S24/2001');
    await user.type(within(dialog).getByLabelText(/department or course/i), 'BSc Software Engineering');
    await user.click(within(dialog).getByRole('button', { name: /^sign up$/i }));

    expect(await within(dialog).findByText('Joan Nakazzi')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Confirmed').length).toBeGreaterThan(0);
  });

  it('creates a session with a department, real date-time and fee', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /new session/i }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/title/i), 'Podcast Mixing Workshop');
    await user.type(within(dialog).getByLabelText(/facilitator/i), 'Katia Birungi');
    await user.type(within(dialog).getByLabelText(/^date & time/i), '2026-12-10T14:00');
    await user.type(within(dialog).getByLabelText(/venue/i), 'Multimedia Studio A');
    await user.selectOptions(await within(dialog).findByLabelText(/department/i), 'Multimedia');
    await user.type(within(dialog).getByLabelText(/capacity/i), '12');
    await user.type(within(dialog).getByLabelText(/fee per seat/i), '50000');
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
