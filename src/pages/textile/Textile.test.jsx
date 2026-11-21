import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { makeMockToken } from '@/mocks/jwt';
import { server } from '@/mocks/server';
import { orders as fixtureOrders } from '@/mocks/fixtures/textile';
import { API_BASE_URL } from '@/services/api-client';
import { textileApi } from '@/services/textile';
import { addDays, startOfWeek, todayIso } from '@/lib/textile';
import { OrderReviewPage } from './OrderReviewPage';
import { OrderBoardPage } from './OrderBoardPage';
import { OrderPage, OrdersIndexPage } from './OrderPage';
import { StockMovementPage } from './StockMovementPage';
import { ReportFaultPage } from './ReportFaultPage';
import { WorkshopBookingPage } from './WorkshopBookingPage';
import { NewOrderPage } from './NewOrderPage';

const token = makeMockToken(['ROLE_TEXTILE_DOMAIN_OWNER'], 'Faith Nabwire');

function renderPage(Page, { path = '/', route = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={<Page token={token} onUnauthorized={vi.fn()} />} />
          <Route path="*" element={<p>Navigated away</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Order Review & Quote', () => {
  it('keeps an unpaid quoted order out of Scheduled and says why', async () => {
    renderPage(OrderReviewPage, { path: '/textile/review', route: '/textile/review?order=TXO-2026-017' });
    expect(await screen.findByRole('heading', { name: 'Branded aprons for bakery staff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move to scheduled/i })).toBeDisabled();
    expect(screen.getByText(/only be scheduled once Finance confirms payment/i)).toBeInTheDocument();
  });

  it('schedules a quoted order once payment is confirmed', async () => {
    const user = userEvent.setup();
    renderPage(OrderReviewPage, { path: '/textile/review', route: '/textile/review?order=TXO-2026-016' });
    const schedule = await screen.findByRole('button', { name: /move to scheduled/i });
    expect(schedule).toBeEnabled();
    await user.click(schedule);
    expect(await screen.findByText(/now on the board as Scheduled/i)).toBeInTheDocument();
  });

  it('blocks the quote when a material is short', async () => {
    const user = userEvent.setup();
    renderPage(OrderReviewPage, { path: '/textile/review', route: '/textile/review?order=TXO-2026-015' });
    const cotton = await screen.findByRole('spinbutton', { name: /quantity of cotton fabric/i });
    await user.clear(cotton);
    await user.type(cotton, '500');
    expect(screen.getByText(/not enough — only 86 in stock/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send quote/i })).toBeDisabled();
  });

  it('checks estimated materials against stock and sends the price-list quote', async () => {
    const user = userEvent.setup();
    renderPage(OrderReviewPage, { path: '/textile/review', route: '/textile/review?order=TXO-2026-015' });
    expect(await screen.findByText(/9 metres — available \(86 in stock\)/)).toBeInTheDocument();
    expect(screen.getByText(/low stock after use — reorder flagged/)).toBeInTheDocument();
    expect(screen.getByText('UGX 185,000')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send quote/i }));
    const quote = await screen.findByRole('region', { name: 'Quote' });
    expect(await within(quote).findByText('Waiting for proof')).toBeInTheDocument();
    expect(within(quote).getByRole('button', { name: /move to scheduled/i })).toBeDisabled();
  });

});

describe('Order Board', () => {
  it('shows the five columns with orders', async () => {
    renderPage(OrderBoardPage);
    for (const label of ['New', 'Scheduled', 'Being made', 'Ready', 'Collected']) {
      expect(await screen.findByRole('heading', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getByText('Branded tote bags ×50')).toBeInTheDocument();
    expect(screen.getByText('Market vendor apron')).toBeInTheDocument();
  });
});

describe('Order page', () => {
  it('only allows Mark ready once the quality checklist is complete', async () => {
    const user = userEvent.setup();
    renderPage(OrderPage, { path: '/textile/orders/:id', route: '/textile/orders/TXO-2026-014' });
    const markReady = await screen.findByRole('button', { name: /mark ready/i });
    expect(markReady).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Final press and fold' }));
    expect(await screen.findByRole('button', { name: /mark ready/i })).toBeEnabled();
  });

  it('records who collected a ready order and when', async () => {
    const user = userEvent.setup();
    renderPage(OrderPage, { path: '/textile/orders/:id', route: '/textile/orders/TXO-2026-012' });
    const collectedBy = await screen.findByRole('textbox', { name: 'Collected by' });
    await user.clear(collectedBy);
    await user.type(collectedBy, 'James Mukasa');
    await user.click(screen.getByRole('button', { name: /record collection/i }));
    const panel = (await screen.findByText('Recorded by')).closest('section');
    expect(within(panel).getByText('James Mukasa')).toBeInTheDocument();
    expect(within(panel).getByText('Faith Nabwire')).toBeInTheDocument();
  });
});

describe('Add or Use Stock', () => {
  it('refuses a movement that would take stock below zero', async () => {
    const user = userEvent.setup();
    renderPage(StockMovementPage);
    await user.selectOptions(await screen.findByRole('combobox', { name: /item/i }), 'stk-zips');
    await user.click(screen.getByRole('radio', { name: 'Correction' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /quantity/i }), { target: { value: '-50' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/never go below zero/);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('records received stock with the new balance', async () => {
    const user = userEvent.setup();
    renderPage(StockMovementPage);
    await user.selectOptions(await screen.findByRole('combobox', { name: /item/i }), 'stk-thread');
    await user.type(screen.getByRole('spinbutton', { name: /quantity/i }), '30');
    expect(screen.getByText(/New balance:/)).toHaveTextContent('44 spools');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Balance now 44/);
  });
});

describe('Report a Fault', () => {
  it('reports a fault, notifies managers and takes the machine out of service', async () => {
    const user = userEvent.setup();
    renderPage(ReportFaultPage);
    await user.selectOptions(await screen.findByRole('combobox', { name: /machine/i }), 'mch-sew-2');
    await user.type(screen.getByRole('textbox', { name: /description/i }), 'Needle bar jams on thick canvas.');
    await user.click(screen.getByRole('button', { name: 'Report' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/Managers notified: Workshop Manager/);
    expect(status).toHaveTextContent(/Fault reported/);
  });
});

describe('Book the Workshop', () => {
  it('warns about a clash with the class timetable and blocks confirmation', async () => {
    renderPage(WorkshopBookingPage);
    await screen.findByRole('heading', { name: /this week|week of/i });
    // Monday 09:00–12:00 is "Pattern Cutting I" in the class timetable; pick next week's Monday so it is never in the past.
    const nextMonday = addDays(startOfWeek(todayIso()), 7);
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: nextMonday } });
    fireEvent.change(screen.getByLabelText(/^start/i), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/^end/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/^purpose/i), { target: { value: 'Student practice' } });
    expect(await screen.findByText(/Clashes with the class timetable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('will not offer a machine that is not Working', async () => {
    renderPage(WorkshopBookingPage);
    const option = await screen.findByRole('option', { name: /Overlock Machine — unavailable/ });
    expect(option).toBeDisabled();
  });
});

describe('New Order', () => {
  it('requires the department rules to be accepted before sending', async () => {
    const user = userEvent.setup();
    renderPage(NewOrderPage);
    await user.type(screen.getByRole('textbox', { name: /customer name/i }), 'Robert Ssali');
    await user.selectOptions(screen.getByRole('combobox', { name: /customer type/i }), 'Public');
    await user.type(screen.getByRole('textbox', { name: /what is wanted/i }), 'Cushion covers');
    await user.type(screen.getByRole('textbox', { name: /^quantity/i }), '4');
    await user.type(screen.getByRole('textbox', { name: /size/i }), '45 × 45 cm');
    const rules = screen.getByRole('checkbox', { name: /accepts the Textile department/i });
    expect(rules).toBeRequired();
    await user.click(rules);
    await user.click(screen.getByRole('button', { name: 'Send order' }));
    expect(await screen.findByText('Navigated away')).toBeInTheDocument();
  });

  async function fillOrder(user) {
    await user.type(screen.getByRole('textbox', { name: /customer name/i }), 'Robert Ssali');
    await user.selectOptions(screen.getByRole('combobox', { name: /customer type/i }), 'Public');
    await user.type(screen.getByRole('textbox', { name: /what is wanted/i }), 'Cushion covers');
    await user.type(screen.getByRole('textbox', { name: /^quantity/i }), '4');
    await user.type(screen.getByRole('textbox', { name: /size/i }), '45 × 45 cm');
  }

  it('uses the Textile rules published in the Rules Manager when there are any', async () => {
    let sentOrder = null;
    server.use(
      http.get(`${API_BASE_URL}/sectors`, () => HttpResponse.json([{ id: 'sec-tx', name: 'Textile' }, { id: 'sec-1', name: 'Technical Assessment' }])),
      http.get(`${API_BASE_URL}/rules`, () => HttpResponse.json([
        { id: 'r-tx', title: 'Fabric deposit', body: 'Customers pay for special-order fabric up front.', scope: 'SECTOR', scopeId: 'sec-tx', mustAccept: true, version: 2, published: true, updatedAt: '2026-11-20T08:00:00Z' },
        { id: 'r-draft', title: 'Unpublished textile rule', body: 'Not live yet.', scope: 'SECTOR', scopeId: 'sec-tx', mustAccept: true, version: 1, published: false, updatedAt: '2026-11-20T08:00:00Z' },
        { id: 'r-other', title: 'Technical Assessment turnaround', body: 'Other department.', scope: 'SECTOR', scopeId: 'sec-1', mustAccept: true, version: 1, published: true, updatedAt: '2026-11-20T08:00:00Z' },
      ])),
      http.post(`${API_BASE_URL}/textile/orders`, async ({ request }) => {
        sentOrder = JSON.parse(await (await request.formData()).get('order').text());
        return HttpResponse.json({ message: 'stop here' }, { status: 400 });
      }),
    );
    const user = userEvent.setup();
    renderPage(NewOrderPage);
    expect(await screen.findByText('Fabric deposit')).toBeInTheDocument();
    expect(screen.queryByText('Unpublished textile rule')).not.toBeInTheDocument();
    expect(screen.queryByText('Technical Assessment turnaround')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /accepts the Textile department/i })).not.toBeInTheDocument();

    await fillOrder(user);
    await user.click(screen.getByRole('button', { name: 'Send order' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/must accept every Textile rule/i);
    expect(sentOrder).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: /read and accept this rule/i }));
    await user.click(screen.getByRole('button', { name: 'Send order' }));
    await screen.findByText('stop here');
    expect(sentOrder).toMatchObject({ rulesAccepted: true, acceptedRules: [{ id: 'r-tx', version: 2 }] });
  });

  it('falls back to the built-in Textile rules when the published rules cannot be loaded', async () => {
    server.use(http.get(`${API_BASE_URL}/rules`, () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 })));
    renderPage(NewOrderPage);
    expect(await screen.findByRole('checkbox', { name: /accepts the Textile department/i })).toBeRequired();
    expect(screen.getByText(/Work starts only after the quote is accepted/i)).toBeInTheDocument();
  });
});

describe('Order Board', () => {
  it('searches orders across every column', async () => {
    const user = userEvent.setup();
    renderPage(OrderBoardPage);
    expect(await screen.findByText('Market vendor apron')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search orders/i }), 'ecobuild');
    expect(screen.getByText('Branded workwear ×20')).toBeInTheDocument();
    expect(screen.queryByText('Market vendor apron')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Showing 1 of/);
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByText('Market vendor apron')).toBeInTheDocument();
  });

  it('flags a paid quote as ready to schedule and filters to it', async () => {
    // Earlier tests schedule the shared mock orders, so serve a known pair of quotes here.
    const byTitle = (title) => fixtureOrders.find((order) => order.whatIsWanted === title);
    server.use(http.get(`${API_BASE_URL}/textile/orders`, () => HttpResponse.json({ items: [
      { ...byTitle('Stage costume alterations'), status: 'QUOTED', payment: { status: 'CONFIRMED', reference: 'PAY-1', confirmedAt: '2026-11-18T10:00:00Z' } },
      { ...byTitle('Branded aprons for bakery staff'), status: 'QUOTED', payment: { status: 'AWAITING_PROOF', reference: null, confirmedAt: null } },
    ] })));
    const user = userEvent.setup();
    renderPage(OrderBoardPage);
    expect(await screen.findByText('Paid · ready to schedule')).toBeInTheDocument();
    const chip = screen.getByRole('button', { name: /ready to schedule/i });
    expect(chip).toHaveTextContent('1');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Stage costume alterations')).toBeInTheDocument();
    expect(screen.queryByText('Branded aprons for bakery staff')).not.toBeInTheDocument();
  });
});

describe('Order pages index', () => {
  it('filters the order list by status and search text', async () => {
    const user = userEvent.setup();
    renderPage(OrdersIndexPage);
    expect(await screen.findByText('Market vendor apron')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /filter by status/i }), 'COLLECTED');
    expect(screen.getByText('Market vendor apron')).toBeInTheDocument();
    expect(screen.queryByText('Graduation sash set')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search orders/i }), 'nothing like this');
    expect(screen.getByText(/No orders match/)).toBeInTheDocument();
  });
});

describe('Order Review queue', () => {
  it('searches the review queue', async () => {
    const user = userEvent.setup();
    renderPage(OrderReviewPage, { path: '/textile/review', route: '/textile/review' });
    const queue = await screen.findByRole('navigation', { name: /orders to review/i });
    await user.type(within(queue).getByRole('searchbox', { name: /search orders to review/i }), 'bakers');
    expect(within(queue).getByText('Branded aprons for bakery staff')).toBeInTheDocument();
    expect(within(queue).queryByText('Custom curtain set, living room')).not.toBeInTheDocument();
    await user.clear(within(queue).getByRole('searchbox'));
    await user.type(within(queue).getByRole('searchbox'), 'zzz');
    expect(within(queue).getByText(/No orders match/)).toBeInTheDocument();
  });

  it('discards a draft only after confirming', async () => {
    await textileApi.createOrder(token, { order: { customerName: 'Draft Customer', whatIsWanted: 'Draft cushions', submit: false }, photo: null });
    const user = userEvent.setup();
    renderPage(OrderReviewPage, { path: '/textile/review', route: '/textile/review' });
    await user.click(await screen.findByRole('button', { name: 'Discard draft: Draft cushions' }));
    const confirm = screen.getByRole('group', { name: /discard draft cushions/i });
    await user.click(within(confirm).getByRole('button', { name: 'Keep' }));
    expect(screen.getByText('Draft cushions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Discard draft: Draft cushions' }));
    await user.click(within(screen.getByRole('group', { name: /discard draft cushions/i })).getByRole('button', { name: /discard/i }));
    await waitFor(() => expect(screen.queryByText('Draft cushions')).not.toBeInTheDocument());
  });

  it('refuses to discard an order that has already been sent', async () => {
    await expect(textileApi.discardDraft(token, 'TXO-2026-015')).rejects.toThrow(/only a draft/i);
  });
});
