import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PartnersMousPage } from './PartnersMousPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PartnersMousPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PartnersMousPage', () => {
  it('renders page eyebrow, heading, and subtitle exactly matching design', async () => {
    renderPage();

    expect(await screen.findByText('OPERATIONS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /partners & mous/i })).toBeInTheDocument();
    expect(
      screen.getByText(/partner organisations, mou renewal dates and relationship status/i),
    ).toBeInTheDocument();
  });

  it('renders the 2 KPI metric cards with correct values', async () => {
    renderPage();

    expect(await screen.findByText('PARTNERS')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    expect(screen.getByText('RENEWAL DUE')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders all partner rows matching the design table', async () => {
    renderPage();

    // Table headers
    expect(await screen.findByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByText('TYPE')).toBeInTheDocument();
    expect(screen.getByText('RENEWAL')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();

    // Row 1
    expect(screen.getByText('Kampala AgriTech Collective')).toBeInTheDocument();
    expect(screen.getAllByText('Industry partner').length).toBe(2);
    expect(screen.getByText('12 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('Renewal due')).toBeInTheDocument();

    // Row 2
    expect(screen.getByText('Ministry of ICT Innovation Fund')).toBeInTheDocument();
    expect(screen.getByText('Funder')).toBeInTheDocument();
    expect(screen.getByText('4 Mar 2027')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBe(2);

    // Row 3
    expect(screen.getByText('Makerere Health Sciences')).toBeInTheDocument();
    expect(screen.getByText('Academic partner')).toBeInTheDocument();

    // Row 4
    expect(screen.getByText('EcoBuild Uganda Ltd')).toBeInTheDocument();
    expect(screen.getByText('30 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
  });
});

