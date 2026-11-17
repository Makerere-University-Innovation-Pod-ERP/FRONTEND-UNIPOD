import { z } from 'zod';
import { request } from './api-client';

export const podcastSlotSchema = z.object({
  id: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  purpose: z.string(),
  producer: z.string(),
  studio: z.string(),
  bookedBy: z.string(),
  status: z.enum(['CONFIRMED', 'CANCELLED']),
  createdAt: z.string(),
});

export const podcastApi = {
  async slots(token, signal) {
    const data = await request('/operations/podcast/slots', { token, signal });
    return z.array(podcastSlotSchema).parse(data);
  },

  async createSlot(body, token, signal) {
    const data = await request('/operations/podcast/slots', {
      method: 'POST',
      body,
      token,
      signal,
    });
    return podcastSlotSchema.parse(data);
  },
};
