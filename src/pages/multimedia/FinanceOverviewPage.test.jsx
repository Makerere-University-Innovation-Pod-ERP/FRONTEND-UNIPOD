import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { FinanceOverviewPage } from './FinanceOverviewPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FinanceOverviewPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FinanceOverviewPage', () => {
  it('renders page eyebrow, greeting, and subtitle matching the design', async () => {
    renderPage();

    expect(await screen.findByText('FINANCE OFFICER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /good morning, daniel\./i })).toBeInTheDocument();
    expect(
      screen.getByText(/here's what's moving across the innovation pipeline and unipod operations today\./i),
    ).toBeInTheDocument();
  });

  it('renders all 5 KPI metric cards with correct values and subtexts', async () => {
    renderPage();

    // Card 1
    expect(await screen.findByText('TOTAL SUBMISSIONS')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('4 student · 6 public')).toBeInTheDocument();

    // Card 2
    expect(screen.getByText('AWAITING REVIEW')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Fact-finding + forwarded')).toBeInTheDocument();

    // Card 3
    expect(screen.getAllByText('REFINEMENT REQUESTED').length).toBe(2);
    expect(screen.getByText('Constructive next steps open')).toBeInTheDocument();

    // Card 4
    expect(screen.getByText('EQUIPMENT UNDER REPAIR')).toBeInTheDocument();
    expect(screen.getByText('Needs maintenance follow-up')).toBeInTheDocument();

    // Card 5
    expect(screen.getByText('BOOKINGS TODAY')).toBeInTheDocument();
    expect(screen.getByText('3 facilities free now')).toBeInTheDocument();
  });

  it('renders pipeline at a glance and needs attention items', async () => {
    renderPage();

    // Pipeline at a glance
    expect(await screen.findByText('Pipeline at a glance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open reports/i })).toBeInTheDocument();
    expect(screen.getByText('RECEIVED')).toBeInTheDocument();
    expect(screen.getByText('REGISTERED')).toBeInTheDocument();
    expect(screen.getByText('UNDER REVIEW')).toBeInTheDocument();
    expect(screen.getByText('FURTHER HANDLING')).toBeInTheDocument();

    // Needs attention
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText(/5 items with an open next step/i)).toBeInTheDocument();
    expect(screen.getByText('Community Waste-to-Energy Initiative')).toBeInTheDocument();
    expect(screen.getByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
    expect(screen.getAllByText('Solar-Powered Cold Storage').length).toBe(2);
    expect(screen.getByText('Accessible Market Price Bulletin')).toBeInTheDocument();
    expect(screen.getByText('Inclusive Learning Audio Notes')).toBeInTheDocument();
  });

  it('renders income, facilities right now, and recent activities', async () => {
    renderPage();

    // Income
    expect(await screen.findByText('Income (month to date)')).toBeInTheDocument();
    expect(screen.getByText('UGX 1.62M')).toBeInTheDocument();
    expect(screen.getByText('4 invoices verified, 1 awaiting bank evidence')).toBeInTheDocument();

    // Facilities
    expect(screen.getByText('Facilities right now')).toBeInTheDocument();
    expect(screen.getByText('Textile Workshop')).toBeInTheDocument();
    expect(screen.getByText('Telecoms Lab')).toBeInTheDocument();
    expect(screen.getByText('CNC & Carpentry Bay')).toBeInTheDocument();
    expect(screen.getByText('Multimedia Studio A')).toBeInTheDocument();

    // Recent activity
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('Dr. Miriam Nsubuga')).toBeInTheDocument();
    expect(screen.getByText('Martha Akello')).toBeInTheDocument();
    expect(screen.getByText('Amina Ssemanda')).toBeInTheDocument();
  });
});
