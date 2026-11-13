import { z } from 'zod';
import { request } from './api-client';

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

export const invoicesApi = {
  async getOverview(token, signal) {
    const data = await request('/finance/invoices/overview', { token, signal });
    return invoicesOverviewSchema.parse(data);
  },

  async verifyPayment(id, token, signal) {
    const data = await request(`/finance/invoices/${id}/verify`, {
      method: 'POST',
      token,
      signal,
    });
    return invoiceSchema.parse(data);
  },

  async releaseReceipt(id, token, signal) {
    const data = await request(`/finance/invoices/${id}/receipt`, {
      method: 'POST',
      token,
      signal,
    });
    return invoiceSchema.parse(data);
  },

  async recordEvidence(id, paymentReference, token, signal) {
    const data = await request(`/finance/invoices/${id}/evidence`, {
      method: 'POST',
      token,
      body: { paymentReference },
      signal,
    });
    return invoiceSchema.parse(data);
  },
};

