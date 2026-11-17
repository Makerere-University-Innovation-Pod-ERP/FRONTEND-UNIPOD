import { z } from 'zod';
import { request } from './api-client';

export const partnerStatusSchema = z.enum([
  'Renewal due',
  'Active',
  'Expiring soon',
  'Expired',
  'ACTIVE',
  'RENEWAL_DUE',
  'EXPIRING_SOON',
  'EXPIRED',
]);

export function normalizePartnerStatus(status) {
  if (!status) return 'Active';
  const upper = String(status).toUpperCase().replace(/[\s-]+/g, '_');
  if (upper === 'RENEWAL_DUE') return 'Renewal due';
  if (upper === 'EXPIRING_SOON') return 'Expiring soon';
  if (upper === 'EXPIRED') return 'Expired';
  return 'Active';
}

export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  renewalDate: z.string().nullable(),
  status: partnerStatusSchema,
  contactPerson: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const partnersOverviewSchema = z.object({
  totalPartners: z.number(),
  renewalDueCount: z.number(),
  partners: z.array(partnerSchema),
});

export const partnersApi = {
  async getOverview(token, signal) {
    const data = await request('/operations/partners/overview', { token, signal });
    return partnersOverviewSchema.parse(data);
  },

  async getPartners(token, signal) {
    const data = await request('/operations/partners', { token, signal });
    return z.array(partnerSchema).parse(data);
  },

  async getPartner(id, token, signal) {
    const data = await request(`/operations/partners/${id}`, { token, signal });
    return partnerSchema.parse(data);
  },

  async updatePartner(id, body, token, signal) {
    const data = await request(`/operations/partners/${id}`, {
      method: 'PUT',
      body,
      token,
      signal,
    });
    return partnerSchema.parse(data);
  },

  async renewMOU(id, renewalDate, token, signal) {
    const data = await request(`/operations/partners/${id}/renew`, {
      method: 'POST',
      body: { renewalDate },
      token,
      signal,
    });
    return partnerSchema.parse(data);
  },
};
