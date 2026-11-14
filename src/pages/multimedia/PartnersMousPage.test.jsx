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
const partnersPath = `${API_BASE_URL}/operations/partners`;
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

function renderPage(roles = []) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PartnersMousPage token="live-test-token" roles={roles} />
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

  it('hides partner creation from unauthorized roles', () => {
    renderPage(['ROLE_SUBMITTER']);

    expect(screen.queryByRole('button', { name: 'Add partner' })).not.toBeInTheDocument();
  });

  it.each(['ROLE_ADMINISTRATOR', 'ROLE_DEPARTMENT_COORDINATOR'])(
    'allows %s to create a partner',
    (role) => {
      renderPage([role]);

      expect(screen.getByRole('button', { name: 'Add partner' })).toBeInTheDocument();
    },
  );

  it('creates a partner through the API and refreshes the live overview', async () => {
    const user = userEvent.setup();
    let partners = [...livePartners];
    let submittedBody;
    server.use(
      http.get(overviewPath, () =>
        HttpResponse.json({
          totalPartners: partners.length,
          renewalDueCount: 0,
          partners,
        }),
      ),
      http.post(partnersPath, async ({ request }) => {
        submittedBody = await request.json();
        const createdPartner = {
          ...submittedBody,
          id: 'created-partner',
          status: 'ACTIVE',
          version: 0,
        };
        partners = [...partners, createdPartner];
        return HttpResponse.json(createdPartner, { status: 201 });
      }),
    );

    renderPage(['ROLE_ADMINISTRATOR']);

    await screen.findByText('Live API Partner 1');
    await user.click(screen.getByRole('button', { name: 'Add partner' }));

    const dialog = screen.getByRole('dialog', { name: 'Add a partner' });
    await user.type(within(dialog).getByLabelText('Partner name *'), 'New Test Partner');
    await user.click(within(dialog).getByRole('button', { name: 'Create partner' }));

    expect(await screen.findByText('New Test Partner')).toBeInTheDocument();
    expect(submittedBody).toEqual({
      name: 'New Test Partner',
      type: 'INDUSTRY_PARTNER',
      renewalDate: null,
      contactPerson: null,
      contactEmail: null,
      notes: null,
    });
    const metrics = screen.getByRole('region', { name: 'Partners KPI metrics' });
    expect(within(metrics).getByText('7')).toBeInTheDocument();
  });

  it('keeps the form open and shows the API error when creation fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(overviewPath, () =>
        HttpResponse.json({
          totalPartners: 6,
          renewalDueCount: 0,
          partners: livePartners,
        }),
      ),
      http.post(partnersPath, () =>
        HttpResponse.json({ detail: 'Partner name already exists.' }, { status: 409 }),
      ),
    );

    renderPage(['ROLE_ADMINISTRATOR']);

    await screen.findByText('Live API Partner 1');
    await user.click(screen.getByRole('button', { name: 'Add partner' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a partner' });
    await user.type(within(dialog).getByLabelText('Partner name *'), 'Duplicate Partner');
    await user.click(within(dialog).getByRole('button', { name: 'Create partner' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Partner name already exists.');
    expect(screen.getByRole('dialog', { name: 'Add a partner' })).toBeInTheDocument();
  });

  it('renews an MOU with the OpenAPI PUT endpoint and an ISO renewal date', async () => {
    const user = userEvent.setup();
    const renewalDuePartners = livePartners.map((partner, index) =>
      index === 0 ? { ...partner, status: 'RENEWAL_DUE' } : partner,
    );
    let submittedBody;
    server.use(
      http.get(overviewPath, () =>
        HttpResponse.json({
          totalPartners: 6,
          renewalDueCount: 1,
          partners: renewalDuePartners,
        }),
      ),
      http.put(`${partnersPath}/live-partner-1/mou`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json({
          ...renewalDuePartners[0],
          renewalDate: submittedBody.renewalDate,
          status: 'ACTIVE',
        });
      }),
    );

    renderPage(['ROLE_ADMINISTRATOR']);

    await user.click(await screen.findByText('Live API Partner 1'));
    const detailDialog = screen.getByRole('dialog');
    await user.click(within(detailDialog).getByRole('button', { name: 'New renewal date *' }));
    const calendarDay = screen
      .getAllByRole('button')
      .find((button) => button.hasAttribute('data-day') && !button.disabled);
    expect(calendarDay).toBeTruthy();
    await user.click(calendarDay);
    await user.click(within(detailDialog).getByRole('button', { name: 'Renew MOU' }));

    expect(await within(detailDialog).findByText('Active')).toBeInTheDocument();
    expect(submittedBody.renewalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(submittedBody.documentReference).toBeNull();
    expect(screen.queryByRole('button', { name: 'Renew MOU' })).not.toBeInTheDocument();
  });
});
