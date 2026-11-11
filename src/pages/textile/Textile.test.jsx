import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeMockToken } from '@/mocks/jwt';
import { addDays, startOfWeek, todayIso } from '@/lib/textile';
import { OrderReviewPage } from './OrderReviewPage';
import { OrderBoardPage } from './OrderBoardPage';
import { OrderPage } from './OrderPage';
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
    await user.type(screen.getByRole('spinbutton', { name: /quantity/i }), '-50');
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
});
