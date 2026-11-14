import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/backend-api';
import { server } from '@/mocks/server';
import { PartnersMousPage } from './PartnersMousPage';

const overviewPath = `${API_BASE_URL}/operations/partners/overview`;
const livePartners = Array.from({ length: 6 }, (_, index) => ({
  id: `live-partner-${index + 1}`,
  name: `Live API Partner ${index + 1}`,
  type: 'INDUSTRY_PARTNER',
  renewalDate: index === 0 ? null : '2027-01-31',
  status: 'ACTIVE',
  contactPerson: null,
  contactEmail: null,
  notes: null,
  version: 0,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PartnersMousPage token="live-test-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PartnersMousPage', () => {
  it('renders the live overview response without fixture partners', async () => {
    server.use(
      http.get(overviewPath, () =>
        HttpResponse.json({
          totalPartners: 6,
          renewalDueCount: 0,
          partners: livePartners,
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Live API Partner 1')).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: 'Partners KPI metrics' });
    expect(within(metrics).getByText('6')).toBeInTheDocument();
    expect(within(metrics).getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Live API Partner 6')).toBeInTheDocument();
    expect(screen.queryByText('Kampala AgriTech Collective')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('filters live partner rows and clears the search', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(overviewPath, () =>
        HttpResponse.json({
          totalPartners: 6,
          renewalDueCount: 0,
          partners: livePartners,
        }),
      ),
    );

    renderPage();

    const search = await screen.findByRole('searchbox', { name: 'Search partners' });
    await screen.findByText('Live API Partner 1');
    await user.type(search, 'partner 3');

    expect(screen.getByText('Live API Partner 3')).toBeInTheDocument();
    expect(screen.queryByText('Live API Partner 1')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 6 partners');

    await user.click(screen.getByRole('button', { name: 'Clear partner search' }));
    expect(screen.getByText('Live API Partner 1')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('6 partners');

    await user.type(search, 'no match');
    expect(screen.getByText(/no partners match/i)).toBeInTheDocument();
    expect(screen.queryByText('Live API Partner 1')).not.toBeInTheDocument();
  });

  it('shows an API error rather than rendering fixture data when the request fails', async () => {
    server.use(
      http.get(overviewPath, () =>
        HttpResponse.json({ detail: 'Partner service unavailable.' }, { status: 503 }),
      ),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Partner service unavailable.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('Kampala AgriTech Collective')).not.toBeInTheDocument();
  });
});
