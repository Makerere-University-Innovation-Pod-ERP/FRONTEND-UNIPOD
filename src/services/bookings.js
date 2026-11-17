import { z } from 'zod';
import { request } from './api-client';

export const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'OUT', 'RETURNED'];
export const BLOCKING_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'CHECKED_IN', 'OUT'];
export const RETURN_CONDITIONS = ['WORKING', 'BEING_REPAIRED', 'DAMAGED'];

export const facilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().nullish(),
  capacity: z.number(),
  status: z.enum(['AVAILABLE', 'BOOKED', 'MAINTENANCE']),
  department: z.string().nullish(),
  requiresSafetyPass: z.boolean().default(false),
});

export const bookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  facilityId: z.string(),
  facilityName: z.string(),
  facilityLocation: z.string().nullish(),
  requesterId: z.string().nullish(),
  purpose: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  attendees: z.number(),
  operator: z.string().nullish(),
  status: z.enum(BOOKING_STATUSES),
  rejectionReason: z.string().nullish(),
  requestType: z.string().nullish(),
  isEquipmentRequest: z.boolean().default(false),
  equipmentName: z.string().nullish(),
  purposeDetail: z.string().nullish(),
  decisionNote: z.string().nullish(),
  decidedAt: z.string().nullish(),
  conditionOut: z.string().nullish(),
  conditionReturned: z.string().nullish(),
  returnedAt: z.string().nullish(),
  returnNotes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
});

const bookingPageSchema = z.object({
  items: z.array(bookingSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
});

export const timetableBlockSchema = z.object({
  id: z.string(),
  facility_id: z.string().nullish(),
  department: z.string().nullish(),
  title: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
});

export const bookingsApi = {
  async facilities(token, signal) {
    return z.array(facilitySchema).parse(await request('/facilities', { token, signal }));
  },

  async list({ date, status, page = 0, size = 100 } = {}, token, signal) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (date) params.set('date', date);
    if (status) params.set('status', status);
    return bookingPageSchema.parse(await request(`/bookings?${params}`, { token, signal }));
  },

  /**
   * @param {{facilityId: string, purpose: string, startsAt: string, endsAt: string, attendees: number,
   *   operator?: string, requestType?: 'FACILITY'|'EQUIPMENT', isEquipmentRequest?: boolean,
   *   equipmentName?: string, purposeDetail?: string}} body
   */
  async create(body, token, signal) {
    return bookingSchema.parse(await request('/bookings', { method: 'POST', body, token, signal }));
  },

  async decideAllocation(id, decision, note, token, signal) {
    return bookingSchema.parse(await request(`/allocations/${encodeURIComponent(id)}/decision`, {
      method: 'POST', body: { decision, ...(note ? { note } : {}) }, token, signal,
    }));
  },

  async returnAllocation(id, { returnedAt, condition, notes }, token, signal) {
    return bookingSchema.parse(await request(`/allocations/${encodeURIComponent(id)}/return`, {
      method: 'POST',
      body: { returned_at: returnedAt, condition_returned: condition, ...(notes ? { notes } : {}) },
      token,
      signal,
    }));
  },

  async timetable({ facilityId, from, to } = {}, token, signal) {
    const params = new URLSearchParams();
    if (facilityId) params.set('facility_id', facilityId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return z.array(timetableBlockSchema).parse(
      await request(`/timetable/blocks${query ? `?${query}` : ''}`, { token, signal }),
    );
  },
};

export function rangesOverlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}
