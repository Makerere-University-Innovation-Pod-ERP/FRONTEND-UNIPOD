import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('renders page heading, description, and the 3 KPI metric cards exactly matching design', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /training & mentorship/i })).toBeInTheDocument();
    expect(screen.getByText(/published sessions, registration capacity and mentorship follow-ups/i)).toBeInTheDocument();

    // Verify 3 KPI cards from the screenshot
    expect(await screen.findByText('UPCOMING SESSIONS')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    expect(screen.getByText('SEATS FILLED')).toBeInTheDocument();
    expect(screen.getByText('63/79')).toBeInTheDocument();

    expect(screen.getByText('MENTORSHIP FOLLOW-UPS')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders the session rows from the storyboard design', async () => {
    renderPage();

    expect(await screen.findByText('Intro to CNC Safety')).toBeInTheDocument();
    expect(screen.getByText('Robinson Mugisha')).toBeInTheDocument();
    expect(screen.getByText('14/18')).toBeInTheDocument();

    expect(screen.getByText('Telecom Systems Bootcamp')).toBeInTheDocument();
    expect(screen.getByText('Faith NamuyanJa')).toBeInTheDocument();
    expect(screen.getByText('22/25')).toBeInTheDocument();

    expect(screen.getByText('Startup Pitch Clinic')).toBeInTheDocument();
    expect(screen.getByText('Grace Namuli')).toBeInTheDocument();
    expect(screen.getByText('11/20')).toBeInTheDocument();

    expect(screen.getByText('Media Production Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Katia Birungi')).toBeInTheDocument();
    expect(screen.getByText('16/16')).toBeInTheDocument();
  });
});
