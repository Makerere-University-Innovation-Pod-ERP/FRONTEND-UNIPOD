import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { server } from '@/mocks/server';
import { PriceListsInvoicesPage } from './PriceListsInvoicesPage';
import { invoicesApi } from '@/services/invoices';

function renderPage(route = '/finance/invoices') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <PriceListsInvoicesPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PriceListsInvoicesPage', () => {
  it('shows backend load failures with a retry instead of a blank finance screen', async () => {
    server.use(
      http.get(`${API_BASE_URL}/finance/summary`, () =>
        HttpResponse.json({ message: 'Finance service unavailable.' }, { status: 503 }),
      ),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Finance service unavailable.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('No authorised price list is currently published.')).not.toBeInTheDocument();
  });

  it('downloads payment proof through the finance proof-file endpoint', async () => {
    const proofFile = await invoicesApi.downloadPaymentProof('inv-3', 'mock-token');

    expect(proofFile.size).toBeGreaterThan(0);
  });

  it('downloads a receipt through the finance receipt-download endpoint', async () => {
    const receiptFile = await invoicesApi.downloadReceipt('inv-4', 'mock-token');

    expect(receiptFile.size).toBeGreaterThan(0);
  });

  it('renders page eyebrow, title, and subtitle matching the design', async () => {
    renderPage();

    expect(await screen.findByText('FINANCE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /price lists & invoices/i })).toBeInTheDocument();
    expect(
      screen.getByText(/invoice status, payment verification and collected income\./i),
    ).toBeInTheDocument();
  });

  it('renders every finance summary field and formats UGX amounts in full', async () => {
    renderPage();

    expect(await screen.findByText('TOTAL INVOICES')).toBeInTheDocument();
    expect(screen.getByText('WAITING FOR PROOF')).toBeInTheDocument();
    expect(screen.getByText('AWAITING VERIFICATION')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('RECEIPTED')).toBeInTheDocument();
    expect(screen.getByText('OUTSTANDING')).toBeInTheDocument();
    expect(screen.getByText('COLLECTED')).toBeInTheDocument();
    expect(screen.getByText('UGX 1,620,000')).toBeInTheDocument();
    expect(screen.getByText('UGX 340,000')).toBeInTheDocument();
    expect(screen.queryByText('UGX 1.62M')).not.toBeInTheDocument();
  });

  it('renders the authorised price list published by the backend', async () => {
    renderPage();

    expect(await screen.findByText('Authorised price list')).toBeInTheDocument();
    const priceList = within(screen.getByText('Authorised price list').closest('.invoices-panel-card'));
    expect(priceList.getByText('Facility booking — half day')).toBeInTheDocument();
    expect(priceList.getByText('UGX 40,000')).toBeInTheDocument();
    expect(screen.queryByText('No authorised price list is currently published.')).not.toBeInTheDocument();
  });

  it('renders the invoices returned by the finance API', async () => {
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
    expect(within(screen.getByText('INV-2026-115').closest('.invoice-item-row'))
      .getByText('Pending evidence')).toBeInTheDocument();

    // Invoice 116
    expect(screen.getByText('INV-2026-116')).toBeInTheDocument();
    expect(screen.getByText('Promo filming — UNIPOD Open Day')).toBeInTheDocument();
    const invoice116 = within(screen.getByText('INV-2026-116').closest('.invoice-item-row'));
    expect(invoice116.getByText('Awaiting verification')).toBeInTheDocument();
    expect(invoice116.getByRole('button', { name: /^verify$/i })).toBeInTheDocument();

    // Invoice 117
    expect(screen.getByText('INV-2026-117')).toBeInTheDocument();
    expect(screen.getByText('Bootcamp seat x3 — Telecoms dept')).toBeInTheDocument();
    const invoice117 = within(screen.getByText('INV-2026-117').closest('.invoice-item-row'));
    expect(invoice117.getByText('UGX 180,000')).toBeInTheDocument();
    expect(invoice117.getByText('Receipted')).toBeInTheDocument();
  });

  it('loads a linked invoice that is beyond the overview page', async () => {
    const linkedInvoice = {
      id: 'invoice-beyond-overview',
      number: 'INV-2026-999',
      customerEmail: 'client@unipod.test',
      customerName: 'Linked client',
      description: 'Invoice available through direct lookup',
      amount: 125000,
      currency: 'UGX',
      sourceType: 'REQUEST',
      sourceId: null,
      status: 'WAITING_FOR_PROOF',
      statusLabel: 'Awaiting payment',
      issuedBy: 'Finance Officer',
      createdAt: '2026-11-20T08:00:00Z',
      updatedAt: '2026-11-20T08:00:00Z',
      paymentProof: null,
      receipt: null,
    };
    server.use(
      http.get(`${API_BASE_URL}/invoices`, () => HttpResponse.json({
        items: [],
        page: 0,
        size: 100,
        totalElements: 101,
        totalPages: 2,
      })),
      http.get(`${API_BASE_URL}/invoices/${linkedInvoice.id}`, () => HttpResponse.json(linkedInvoice)),
    );

    renderPage(`/finance/invoices?invoice=${linkedInvoice.id}`);

    expect(await screen.findByText('INV-2026-999')).toBeInTheDocument();
    expect(screen.getByText('Invoice available through direct lookup')).toBeInTheDocument();
  });

  it('opens payment verification modal when clicking verify on invoice 116', async () => {
    const user = userEvent.setup();
    renderPage();

    const invoiceRow = await screen.findByText('INV-2026-116');
    const verifyBtn = within(invoiceRow.closest('.invoice-item-row'))
      .getByRole('button', { name: /^verify$/i });
    await user.click(verifyBtn);

    expect(await screen.findByText('Verify Payment Evidence')).toBeInTheDocument();
    expect(screen.getByText('Confirm Verification')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download payment proof/i })).toBeInTheDocument();
  });

  it('lets finance reject submitted proof with a required reason instead of recording evidence', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('INV-2026-116'));
    const reasonInput = await screen.findByLabelText(/rejection reason/i);
    const rejectButton = screen.getByRole('button', { name: /reject proof/i });

    expect(rejectButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^record$/i })).not.toBeInTheDocument();

    await user.type(reasonInput, 'The uploaded proof does not show the invoice amount.');
    await user.click(rejectButton);

    expect(await screen.findByText(/previous proof rejected: the uploaded proof does not show the invoice amount/i)).toBeInTheDocument();
  });
});

