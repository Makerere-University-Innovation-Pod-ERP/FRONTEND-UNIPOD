import { z } from 'zod';
import { request } from './api-client';

export const partnerStatusSchema = z.enum([
  'Renewal due',
  'Active',
  'Expiring soon',
]);

export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  renewalDate: z.string(),
  status: partnerStatusSchema,
  contactPerson: z.string().optional(),
  contactEmail: z.string().optional(),
  notes: z.string().optional(),
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
};

