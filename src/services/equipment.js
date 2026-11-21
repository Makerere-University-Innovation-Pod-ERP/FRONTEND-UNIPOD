import { z } from 'zod';
import { request } from './api-client';

export const equipmentStateSchema = z.enum([
  'AVAILABLE', 'IN_USE', 'LOANED', 'UNDER_MAINTENANCE', 'FAULTY',
]);

export const equipmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  assetTag: z.string(),
  totalQuantity: z.number(),
  availableQuantity: z.number(),
  state: equipmentStateSchema,
  location: z.string(),
  note: z.string(),
  updatedAt: z.string(),
});

export const equipmentApi = {
  async list(token, signal) {
    const data = await request('/operations/equipment', { token, signal });
    return z.array(equipmentItemSchema).parse(data);
  },

  async reportFault(body, token, signal) {
    const data = await request('/operations/equipment/report-fault', {
      method: 'POST',
      body,
      token,
      signal,
    });
    return equipmentItemSchema.parse(data);
  },

  async markWorking(id, token, signal) {
    const data = await request(`/operations/equipment/${encodeURIComponent(id)}/mark-working`, {
      method: 'POST',
      body: {},
      token,
      signal,
    });
    return equipmentItemSchema.parse(data);
  },
};
