import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PriceListsInvoicesPage } from './PriceListsInvoicesPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PriceListsInvoicesPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PriceListsInvoicesPage', () => {
  it('renders page eyebrow, title, and subtitle matching the design', async () => {
    renderPage();

    expect(await screen.findByText('FINANCE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /price lists & invoices/i })).toBeInTheDocument();
    expect(
      screen.getByText(/authorised service charges, verification queue and receipts\./i),
    ).toBeInTheDocument();
  });

  it('renders all 3 KPI metric cards with correct values', async () => {
    renderPage();

    // Card 1: Income (MTD)
    expect(await screen.findByText('INCOME (MTD)')).toBeInTheDocument();
    expect(screen.getByText('UGX 1.62M')).toBeInTheDocument();

    // Card 2: Awaiting verification
    expect(screen.getByText('AWAITING VERIFICATION')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Card 3: Receipted
    expect(screen.getByText('RECEIPTED')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders all 4 authorised price list items', async () => {
    renderPage();

    expect(await screen.findByText('Authorised price list')).toBeInTheDocument();
    expect(screen.getByText('Facility booking — half day')).toBeInTheDocument();
    expect(screen.getByText('UGX 40,000')).toBeInTheDocument();

    expect(screen.getByText('Equipment hire — CNC router (per hr)')).toBeInTheDocument();
    expect(screen.getByText('UGX 15,000')).toBeInTheDocument();

    expect(screen.getByText('Media production — short promo')).toBeInTheDocument();
    expect(screen.getAllByText('UGX 250,000').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Training fee — Bootcamp (per seat)')).toBeInTheDocument();
    expect(screen.getAllByText('UGX 60,000').length).toBe(2);
  });

  it('renders all 4 invoices and their verification states', async () => {
    renderPage();

    expect(await screen.findByText('Invoices & payment verification')).toBeInTheDocument();

    // Invoice 114
    expect(screen.getByText('INV-2026-114')).toBeInTheDocument();
    expect(screen.getByText('Smart Irrigation — technical assessment fee')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();

    // Invoice 115
    expect(screen.getByText('INV-2026-115')).toBeInTheDocument();
    expect(screen.getByText('Telecoms Lab booking — Peter Okello')).toBeInTheDocument();
    expect(screen.getByText('UGX 30,000')).toBeInTheDocument();
    expect(screen.getByText('Pending evidence')).toBeInTheDocument();

    // Invoice 116
    expect(screen.getByText('INV-2026-116')).toBeInTheDocument();
    expect(screen.getByText('Promo filming — UNIPOD Open Day')).toBeInTheDocument();
    expect(screen.getByText('Awaiting verification')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^verify$/i })).toBeInTheDocument();

    // Invoice 117
    expect(screen.getByText('INV-2026-117')).toBeInTheDocument();
    expect(screen.getByText('Bootcamp seat x3 — Telecoms dept')).toBeInTheDocument();
    expect(screen.getByText('UGX 180,000')).toBeInTheDocument();
    expect(screen.getByText('Receipted')).toBeInTheDocument();
  });

  it('opens payment verification modal when clicking verify on invoice 116', async () => {
    const user = userEvent.setup();
    renderPage();

    const verifyBtn = await screen.findByRole('button', { name: /^verify$/i });
    await user.click(verifyBtn);

    expect(await screen.findByText('Verify Payment Evidence')).toBeInTheDocument();
    expect(screen.getByText('Confirm Verification')).toBeInTheDocument();
  });
});

