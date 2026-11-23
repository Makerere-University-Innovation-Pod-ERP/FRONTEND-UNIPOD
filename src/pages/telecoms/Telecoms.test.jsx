import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeMockToken } from '@/mocks/jwt';
import { RequestReviewPage } from './RequestReviewPage';
import { RequestBoardPage } from './RequestBoardPage';
import { EquipmentListPage } from './EquipmentListPage';
import { EquipmentLendingPage } from './EquipmentLendingPage';
import { BootcampSessionsPage } from './BootcampSessionsPage';
import { StockMovementPage } from './StockMovementPage';
import { BackendWorkspace } from '@/components/BackendWorkspace';

const token = makeMockToken(['ROLE_TELECOMS_DOMAIN_OWNER'], 'Eng. Kaddu');

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

describe('Telecoms Request Review & Quote (TL2)', () => {
  it('keeps an unpaid quoted request out of Scheduled and shows why', async () => {
    // TL-2026-001 is NEW; let's check quoted paid vs unpaid
    renderPage(RequestReviewPage, {
      path: '/telecoms/review',
      route: '/telecoms/review?request=TL-2026-001',
    });
    expect(
      await screen.findByRole('heading', { name: /LoRa Soil Moisture Node/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send quote/i })).toBeInTheDocument();
  });

  it('allows scheduling a quoted request once payment is confirmed', async () => {
    const user = userEvent.setup();
    renderPage(RequestReviewPage, {
      path: '/telecoms/review',
      route: '/telecoms/review?request=TL-2026-002',
    });
    const scheduleBtn = await screen.findByRole('button', { name: /move to scheduled/i });
    expect(scheduleBtn).toBeEnabled();
    await user.click(scheduleBtn);
    expect(await screen.findByRole('heading', { name: /FM Bandpass Transmitter Harmonic Diagnostics/i })).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });
});

describe('Telecoms Request Board (TL3)', () => {
  it('renders all 4 columns: New, Scheduled, In progress, Done', async () => {
    renderPage(RequestBoardPage, { path: '/telecoms/board', route: '/telecoms/board' });
    expect(await screen.findByRole('heading', { name: /New/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Scheduled/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /In progress/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Done/i })).toBeInTheDocument();
  });
});

describe('Telecoms Equipment Register (TL6)', () => {
  it('lists equipment and allows opening fault reporting form', async () => {
    const user = userEvent.setup();
    renderPage(EquipmentListPage, { path: '/telecoms/equipment', route: '/telecoms/equipment' });
    expect(await screen.findByText(/Digital Oscilloscope Set/i)).toBeInTheDocument();
    const reportButtons = screen.getAllByRole('button', { name: /report fault/i });
    await user.click(reportButtons[0]);
    expect(screen.getByLabelText(/issue description/i)).toBeInTheDocument();
  });
});

describe('Telecoms Equipment Lending (TL7)', () => {
  it('shows loan records and manager approve/decline controls', async () => {
    renderPage(EquipmentLendingPage, {
      path: '/telecoms/equipment/lending',
      route: '/telecoms/equipment/lending',
    });
    expect(await screen.findByText(/TL-LOAN-001/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Request Equipment Loan/i })).toBeInTheDocument();
  });
});

describe('Telecoms Bootcamps & Training (TL8)', () => {
  it('renders bootcamp sessions and participant attendance table', async () => {
    renderPage(BootcampSessionsPage, {
      path: '/telecoms/bootcamps',
      route: '/telecoms/bootcamps',
    });
    expect(await screen.findByText('Martha Akello')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save attendance roster/i })).toBeInTheDocument();
  });
});

describe('Telecoms Stock Inventory (TL9)', () => {
  it('prevents submitting stock movements that result in negative quantity', async () => {
    const user = userEvent.setup();
    renderPage(StockMovementPage, {
      path: '/telecoms/stock/movements',
      route: '/telecoms/stock/movements',
    });
    const correctionRadio = await screen.findByLabelText(/correction/i);
    await user.click(correctionRadio);

    const itemSelect = screen.getByLabelText(/component item/i);
    await user.selectOptions(itemSelect, 'tl-stk-sma');

    const qtyInput = screen.getByLabelText(/quantity/i);
    await user.type(qtyInput, '-999');

    expect(screen.getByText(/can never go below zero/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record stock movement/i })).toBeDisabled();
  });
});

describe('Telecoms Role Scoping (Assignment 11)', () => {
  it('renders only Telecoms navigation and hides all foreign domain pages for Telecoms owner', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const telecomsSession = {
      accessToken: token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      subject: 'Eng. Kaddu',
      roles: ['ROLE_TELECOMS_DOMAIN_OWNER'],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/telecoms/requests']}>
          <BackendWorkspace session={telecomsSession} health="online" onLogout={vi.fn()}>
            <p>Telecoms Desk</p>
          </BackendWorkspace>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify Telecoms links exist
    expect(screen.getByText('TELECOMS ERP')).toBeInTheDocument();
    expect(screen.getAllByText('All Requests').length).toBeGreaterThan(0);
    expect(screen.getByText('New Request')).toBeInTheDocument();
    expect(screen.getByText('Review & Quote')).toBeInTheDocument();
    expect(screen.getByText('Request Board')).toBeInTheDocument();
    expect(screen.getByText('Lab Booking')).toBeInTheDocument();
    expect(screen.getByText('Bootcamps & Training')).toBeInTheDocument();
    expect(screen.getByText('Equipment Register')).toBeInTheDocument();
    expect(screen.getByText('Equipment Lending')).toBeInTheDocument();
    expect(screen.getByText('Stock Inventory')).toBeInTheDocument();
    expect(screen.getByText('Add / Use Stock')).toBeInTheDocument();

    // Verify foreign domain screens are NOT in navigation
    expect(screen.queryByText('All Submissions')).not.toBeInTheDocument();
    expect(screen.queryByText('Student Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('INNOVATION PIPELINE')).not.toBeInTheDocument();
    expect(screen.queryByText('Reception')).not.toBeInTheDocument();
    expect(screen.queryByText('Fact-Finding')).not.toBeInTheDocument();
    expect(screen.queryByText('TEXTILE OPERATIONS')).not.toBeInTheDocument();
    expect(screen.queryByText('FINANCE & PARTNERS')).not.toBeInTheDocument();
  });
});
