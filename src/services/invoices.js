import { z } from 'zod';
import { request, requestFile } from './api-client';

export const SUBMITTER_INVOICE_STATUSES = [
  'WAITING_FOR_PROOF',
  'WAITING_FOR_CHECK',
  'PAID',
  'RECEIPTED',
];

export const MAX_PAYMENT_PROOF_SIZE = 15 * 1024 * 1024;

const submitterPaymentProofSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  amount: z.number().int(),
  paidOn: z.string(),
  contentType: z.string().nullable().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  originalFilename: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  rejectionReason: z.string().nullable().optional(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  verifiedBy: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
});

export const submitterReceiptSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  receiptNumber: z.string(),
  issuedBy: z.string(),
  issuedAt: z.string(),
});

export const submitterInvoiceSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  customerEmail: z.string().email(),
  customerName: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  description: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  sourceType: z.enum(['REQUEST', 'BOOKING', 'SESSION', 'JOB']),
  sourceId: z.string().nullable().optional(),
  status: z.enum(SUBMITTER_INVOICE_STATUSES),
  statusLabel: z.string(),
  issuedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  paymentProof: submitterPaymentProofSchema.nullable().optional(),
  receipt: submitterReceiptSchema.nullable().optional(),
});

const submitterInvoicePageSchema = z.object({
  items: z.array(submitterInvoiceSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

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
  async listMyInvoices(token, { page = 0, size = 25, status } = {}, signal) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    return submitterInvoicePageSchema.parse(
      await request(`/me/invoices?${params}`, { token, signal }),
    );
  },

  async myInvoice(id, token, signal) {
    return submitterInvoiceSchema.parse(
      await request(`/me/invoices/${encodeURIComponent(id)}`, { token, signal }),
    );
  },

  async uploadMyPaymentProof(id, { reference, amount, paidOn, file }, token, signal) {
    const body = new FormData();
    body.append('reference', reference);
    body.append('amount', String(amount));
    body.append('paidOn', paidOn);
    body.append('file', file, file.name);
    return submitterInvoiceSchema.parse(await request(`/me/invoices/${encodeURIComponent(id)}/proof`, {
      method: 'POST',
      body,
      token,
      signal,
    }));
  },

  async myReceipt(id, token, signal) {
    return submitterReceiptSchema.parse(
      await request(`/me/invoices/${encodeURIComponent(id)}/receipt`, { token, signal }),
    );
  },

  async downloadMyInvoicePdf(id, token, signal) {
    return requestFile(`/me/invoices/${encodeURIComponent(id)}/pdf`, token, signal);
  },

  async downloadMyPaymentProof(id, token, signal) {
    return requestFile(`/me/invoices/${encodeURIComponent(id)}/proof/file`, token, signal);
  },

  async downloadMyReceiptPdf(id, token, signal) {
    return requestFile(`/me/invoices/${encodeURIComponent(id)}/receipt/pdf`, token, signal);
  },

  async downloadMyReceipt(id, token, signal) {
    return requestFile(`/me/invoices/${encodeURIComponent(id)}/receipt/download`, token, signal);
  },

  async getOverview(token, signal) {
    const [summaryResponse, invoicePage, priceListResponse] = await Promise.all([
      request('/finance/summary', { token, signal }),
      request('/invoices?size=100', { token, signal }),
      request('/finance/price-list', { token, signal }),
    ]);
    const summary = financeSummarySchema.parse(summaryResponse);
    const invoices = (invoicePage.items ?? []).map(toInvoiceViewModel);
    const priceList = priceListResponse.items ?? [];

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
      priceList,
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

