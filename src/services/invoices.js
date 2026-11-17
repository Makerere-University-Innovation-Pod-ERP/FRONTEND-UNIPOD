import { z } from 'zod';
import { request, requestFile } from './api-client';

export const invoiceStatusSchema = z.enum([
  'Pending evidence',
  'Awaiting verification',
  'Verified',
  'Receipted',
]);

export const priceListItemSchema = z.object({
  id: z.string(),
  service: z.string(),
  category: z.string(),
  rate: z.string(),
  rateNumeric: z.number(),
  unit: z.string(),
  description: z.string().optional(),
});

export const invoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  title: z.string(),
  client: z.string(),
  amount: z.string(),
  amountNumeric: z.number(),
  status: invoiceStatusSchema,
  paymentReference: z.string().nullable().optional(),
  date: z.string(),
  receiptNumber: z.string().nullable().optional(),
  paymentProof: z.object({
    id: z.string(),
    reference: z.string(),
    amount: z.number().optional(),
    paidOn: z.string().optional(),
    originalFilename: z.string().nullable().optional(),
    contentType: z.string().nullable().optional(),
    fileSize: z.number().optional(),
    uploadedAt: z.string().optional(),
    status: z.string().optional(),
    rejectionReason: z.string().nullable().optional(),
  }).nullable().optional(),
});

export const invoicesMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  variant: z.enum(['default', 'burgundy', 'forest']).default('default'),
  icon: z.string().optional(),
});

export const invoicesOverviewSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  metrics: z.array(invoicesMetricSchema),
  priceList: z.array(priceListItemSchema),
  invoices: z.array(invoiceSchema),
});

const financeSummarySchema = z.object({
  totalInvoices: z.number(),
  waitingForProof: z.number(),
  waitingForCheck: z.number(),
  paid: z.number(),
  receipted: z.number(),
  outstandingUgx: z.number(),
  collectedUgx: z.number(),
});

const formatCurrency = (amount) => {
  const numericAmount = Number(amount ?? 0);
  return `UGX ${numericAmount.toLocaleString('en-US')}`;
};

const normalizeInvoiceStatus = (status) => {
  switch (status) {
    case 'WAITING_FOR_PROOF':
      return 'Pending evidence';
    case 'WAITING_FOR_CHECK':
      return 'Awaiting verification';
    case 'PAID':
      return 'Verified';
    case 'RECEIPTED':
      return 'Receipted';
    default:
      return 'Pending evidence';
  }
};

const toInvoiceViewModel = (invoice) => ({
  id: invoice.id,
  invoiceNumber: invoice.number || invoice.invoiceNumber || '—',
  title: invoice.description || invoice.title || 'Invoice',
  client: invoice.customerName || invoice.customerEmail || invoice.client || 'Client',
  amount: formatCurrency(invoice.amount ?? invoice.amountNumeric ?? 0),
  amountNumeric: Number(invoice.amount ?? invoice.amountNumeric ?? 0),
  status: normalizeInvoiceStatus(invoice.status),
  paymentReference: invoice.paymentProof?.reference ?? invoice.paymentReference ?? null,
  date: invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : invoice.date || '—',
  receiptNumber: invoice.receipt?.receiptNumber ?? invoice.receiptNumber ?? null,
  paymentProof: invoice.paymentProof ?? null,
});

export const invoicesApi = {
  async getOverview(token, signal) {
    const [summaryResponse, invoicePage] = await Promise.all([
      request('/finance/summary', { token, signal }),
      request('/invoices?size=100', { token, signal }),
    ]);
    const summary = financeSummarySchema.parse(summaryResponse);
    const invoices = (invoicePage.items ?? []).map(toInvoiceViewModel);

    return invoicesOverviewSchema.parse({
      eyebrow: 'FINANCE',
      title: 'Price Lists & Invoices',
      subtitle: 'Invoice status, payment verification and collected income.',
      metrics: [
        {
          id: 'total-invoices',
          label: 'TOTAL INVOICES',
          value: summary.totalInvoices,
          variant: 'default',
          icon: 'FileText',
        },
        {
          id: 'waiting-for-proof',
          label: 'WAITING FOR PROOF',
          value: summary.waitingForProof,
          variant: 'default',
          icon: 'Clock',
        },
        {
          id: 'waiting-for-check',
          label: 'AWAITING VERIFICATION',
          value: summary.waitingForCheck,
          variant: 'burgundy',
          icon: 'Clock',
        },
        {
          id: 'paid',
          label: 'PAID',
          value: summary.paid,
          variant: 'default',
          icon: 'CheckCircle',
        },
        {
          id: 'receipted',
          label: 'RECEIPTED',
          value: summary.receipted,
          variant: 'default',
          icon: 'Receipt',
        },
        {
          id: 'outstanding',
          label: 'OUTSTANDING',
          value: formatCurrency(summary.outstandingUgx),
          variant: 'burgundy',
          icon: 'AlertCircle',
        },
        {
          id: 'collected',
          label: 'COLLECTED',
          value: formatCurrency(summary.collectedUgx),
          variant: 'forest',
          icon: 'DollarSign',
        },
      ],
      priceList: [],
      invoices,
    });
  },

  async verifyPayment(id, proofId, token, signal) {
    const data = await request(`/invoices/${encodeURIComponent(id)}/verify?proofId=${encodeURIComponent(proofId)}`, {
      method: 'POST',
      token,
      signal,
    });
    return invoiceSchema.parse(toInvoiceViewModel(data));
  },

  async rejectPayment(id, proofId, reason, token, signal) {
    const data = await request(`/invoices/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      token,
      body: { proofId, reason },
      signal,
    });
    return invoiceSchema.parse(toInvoiceViewModel(data));
  },

  async releaseReceipt(id, token, signal) {
    const data = await request(`/invoices/${encodeURIComponent(id)}/receipt`, {
      method: 'POST',
      token,
      signal,
    });
    return invoiceSchema.parse(toInvoiceViewModel(data));
  },

  async downloadPaymentProof(id, token, signal) {
    return requestFile(`/invoices/${encodeURIComponent(id)}/proof/file`, token, signal);
  },

  async downloadReceipt(id, token, signal) {
    return requestFile(`/invoices/${encodeURIComponent(id)}/receipt/download`, token, signal);
  },
};

