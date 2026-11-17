import { z } from 'zod';
import { request } from './api-client';

export const contractStatusSchema = z.enum(['DRAFT', 'SIGNED', 'COMPLETED']);

export const eventContractSchema = z.object({
  id: z.string(),
  client: z.string(),
  event: z.string(),
  date: z.string(),
  place: z.string(),
  agreedPriceUgx: z.number(),
  paymentDueDate: z.string().nullable(),
  signedPaperworkReference: z.string().nullable(),
  status: contractStatusSchema,
  notes: z.string().default(''),
  createdAt: z.string(),
});

export const contractsApi = {
  async list(token, signal) {
    const data = await request('/operations/contracts', { token, signal });
    return z.array(eventContractSchema).parse(data);
  },

  async create(body, token, signal) {
    const data = await request('/operations/contracts', {
      method: 'POST',
      body,
      token,
      signal,
    });
    return eventContractSchema.parse(data);
  },

  async update(id, body, token, signal) {
    const data = await request(`/operations/contracts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
      token,
      signal,
    });
    return eventContractSchema.parse(data);
  },
};
