import { z } from 'zod';
import { request } from './api-client';

/**
 * Textile Operations API (/textile/*). These endpoints are not yet part of
 * the deployed backend contract. They follow the existing backend's path and
 * response conventions (see services/backend-api.js and fact-finding.js) and
 * are served by the MSW handlers in src/mocks until the backend team ships
 * them — confirm the shapes with them before treating this as final.
 *
 * Payment is owned by the shared Finance screens (Assignment 6): this module
 * only reads `order.payment`. The backend must refuse to schedule an order
 * whose payment is not CONFIRMED (409), and must refuse any stock movement
 * that would take an item below zero (409).
 */

const orderStatus = z.enum(['DRAFT', 'NEW', 'AWAITING_DETAILS', 'RETURNED', 'QUOTED', 'SCHEDULED', 'BEING_MADE', 'READY', 'COLLECTED']);
const paymentStatus = z.enum(['NOT_REQUESTED', 'AWAITING_PROOF', 'PROOF_SUBMITTED', 'CONFIRMED', 'REJECTED']);
const machineState = z.enum(['WORKING', 'FAULT_REPORTED', 'SERVICE_DUE', 'BEING_REPAIRED']);
const movementType = z.enum(['RECEIVED', 'USED_ON_ORDER', 'CORRECTION']);

export const materialLineSchema = z.object({
  itemId: z.string(),
  quantity: z.number(),
});

export const orderSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  customerName: z.string(),
  customerType: z.string(),
  whatIsWanted: z.string(),
  quantity: z.string(),
  sizeDesign: z.string(),
  dateNeeded: z.string().nullable(),
  photo: z.object({ name: z.string(), url: z.string().nullable() }).nullable(),
  rulesAccepted: z.boolean(),
  status: orderStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
  estimate: z.object({
    materials: z.array(materialLineSchema),
    priceListItemId: z.string().nullable(),
    priceQuantity: z.number(),
  }).nullable(),
  quote: z.object({
    amount: z.number(),
    currency: z.string(),
    priceListItemId: z.string(),
    priceQuantity: z.number(),
    expectedCompletion: z.string(),
    sentAt: z.string(),
    sentBy: z.string(),
  }).nullable(),
  payment: z.object({
    status: paymentStatus,
    reference: z.string().nullable(),
    confirmedAt: z.string().nullable(),
  }),
  production: z.object({
    materialUsed: z.string(),
    machineId: z.string().nullable(),
    staff: z.string(),
    notes: z.string(),
  }),
  qualityChecklist: z.array(z.object({ id: z.string(), label: z.string(), checked: z.boolean() })),
  collection: z.object({
    collectedBy: z.string(),
    collectedAt: z.string(),
    recordedBy: z.string(),
  }).nullable(),
  history: z.array(z.object({
    status: orderStatus,
    by: z.string(),
    at: z.string(),
    note: z.string().nullable(),
  })),
});

const orderListSchema = z.object({ items: z.array(orderSchema) });

export const priceListItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  unitPrice: z.number(),
  leadDays: z.number(),
});

export const stockItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  quantity: z.number(),
  minimum: z.number(),
  location: z.string(),
});

export const stockMovementSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  type: movementType,
  quantity: z.number(),
  balanceAfter: z.number(),
  orderId: z.string().nullable(),
  orderCode: z.string().nullable(),
  note: z.string(),
  by: z.string(),
  at: z.string(),
});

const stockListSchema = z.object({
  items: z.array(stockItemSchema),
  movementsThisWeek: z.number(),
});

const movementResultSchema = z.object({
  movement: stockMovementSchema,
  item: stockItemSchema,
});

export const machineSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: machineState,
  note: z.string(),
  updatedAt: z.string(),
});

const faultReportResultSchema = z.object({
  machine: machineSchema,
  report: z.object({
    id: z.string(),
    kind: z.enum(['FAULT', 'SERVICE']),
    description: z.string(),
    photo: z.object({ name: z.string() }).nullable(),
    by: z.string(),
    at: z.string(),
  }),
  managersNotified: z.array(z.string()),
});

export const attendeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  attended: z.boolean(),
});

export const bookingSchema = z.object({
  id: z.string(),
  kind: z.enum(['WORKSHOP', 'TRAINING']),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  purpose: z.string(),
  machineId: z.string().nullable(),
  capacity: z.number().nullable(),
  bookedBy: z.string(),
  status: z.enum(['APPROVED', 'PENDING', 'CANCELLED']),
  attendees: z.array(attendeeSchema),
});

export const timetableEntrySchema = z.object({
  id: z.string(),
  weekday: z.number(),
  start: z.string(),
  end: z.string(),
  label: z.string(),
});

const bookingCalendarSchema = z.object({
  bookings: z.array(bookingSchema),
  timetable: z.array(timetableEntrySchema),
});

const path = (id) => encodeURIComponent(id);

/** Builds the multipart body the order/report endpoints expect: a JSON part plus an optional file. */
function multipart(jsonPartName, json, file) {
  const body = new FormData();
  body.append(jsonPartName, new Blob([JSON.stringify(json)], { type: 'application/json' }));
  if (file) body.append('photo', file);
  return body;
}

export const textileApi = {
  orders: async (token, signal) => orderListSchema.parse(await request('/textile/orders', { token, signal })).items,
  order: async (token, id, signal) => orderSchema.parse(await request(`/textile/orders/${path(id)}`, { token, signal })),
  createOrder: async (token, { order, photo }) =>
    orderSchema.parse(await request('/textile/orders', { token, body: multipart('order', order, photo) })),
  updateDraft: async (token, id, { order, photo }) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}`, { token, method: 'PUT', body: multipart('order', order, photo) })),
  sendQuote: async (token, id, body) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/quote`, { token, body })),
  requestDetails: async (token, id, message) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/request-details`, { token, body: { message } })),
  sendBack: async (token, id, reason) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/send-back`, { token, body: { reason } })),
  transition: async (token, id, toStatus) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/transitions`, { token, body: { toStatus } })),
  saveProduction: async (token, id, body) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/production`, { token, method: 'PUT', body })),
  saveQuality: async (token, id, checklist) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/quality`, { token, method: 'PUT', body: { checklist } })),
  recordCollection: async (token, id, collectedBy) =>
    orderSchema.parse(await request(`/textile/orders/${path(id)}/collection`, { token, body: { collectedBy } })),

  priceList: async (token, signal) =>
    z.object({ items: z.array(priceListItemSchema) }).parse(await request('/textile/price-list', { token, signal })).items,

  stock: async (token, signal) => stockListSchema.parse(await request('/textile/stock', { token, signal })),
  updateMinimum: async (token, id, minimum) =>
    stockItemSchema.parse(await request(`/textile/stock/${path(id)}`, { token, method: 'PATCH', body: { minimum } })),
  movements: async (token, signal) =>
    z.object({ items: z.array(stockMovementSchema) }).parse(await request('/textile/stock/movements', { token, signal })).items,
  recordMovement: async (token, body) =>
    movementResultSchema.parse(await request('/textile/stock/movements', { token, body })),

  machines: async (token, signal) =>
    z.object({ items: z.array(machineSchema) }).parse(await request('/textile/machines', { token, signal })).items,
  reportFault: async (token, id, { report, photo }) =>
    faultReportResultSchema.parse(await request(`/textile/machines/${path(id)}/reports`, { token, body: multipart('report', report, photo) })),
  markWorking: async (token, id, note) =>
    machineSchema.parse(await request(`/textile/machines/${path(id)}/mark-working`, { token, body: { note } })),

  bookings: async (token, from, to, signal) => {
    const query = new URLSearchParams({ from, to });
    return bookingCalendarSchema.parse(await request(`/textile/bookings?${query}`, { token, signal }));
  },
  createBooking: async (token, body) =>
    bookingSchema.parse(await request('/textile/bookings', { token, body })),
  /** Proposed endpoint: POST /textile/bookings/:id/cancel { reason } → the cancelled booking. */
  cancelBooking: async (token, id, reason) =>
    bookingSchema.parse(await request(`/textile/bookings/${path(id)}/cancel`, { token, body: { reason } })),
  addAttendee: async (token, id, name) =>
    bookingSchema.parse(await request(`/textile/bookings/${path(id)}/attendees`, { token, body: { name } })),
  setAttendance: async (token, id, attendeeId, attended) =>
    bookingSchema.parse(await request(`/textile/bookings/${path(id)}/attendees/${path(attendeeId)}`, { token, method: 'PUT', body: { attended } })),
};
