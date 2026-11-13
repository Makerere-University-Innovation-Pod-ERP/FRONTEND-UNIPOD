import { z } from 'zod';
import { request } from './api-client';

const requestStatus = z.enum([
  'DRAFT', 'NEW', 'AWAITING_DETAILS', 'RETURNED', 'QUOTED', 'SCHEDULED', 'IN_PROGRESS', 'DONE',
]);
const paymentStatus = z.enum([
  'NOT_REQUESTED', 'AWAITING_PROOF', 'PROOF_SUBMITTED', 'CONFIRMED', 'REJECTED',
]);
const equipmentState = z.enum([
  'AVAILABLE', 'IN_USE', 'LOANED', 'UNDER_MAINTENANCE', 'FAULTY',
]);
const loanStatus = z.enum([
  'PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'ACTIVE', 'RETURNED', 'OVERDUE',
]);
const movementType = z.enum(['RECEIVED', 'USED_ON_REQUEST', 'CORRECTION']);

export const partEstimateSchema = z.object({
  itemId: z.string(),
  quantity: z.number(),
});

export const telecomsRequestSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  customerName: z.string(),
  customerType: z.string(),
  serviceWanted: z.string(),
  equipmentInvolved: z.string(),
  preferredDate: z.string().nullable(),
  rulesAccepted: z.boolean(),
  status: requestStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
  estimate: z.object({
    parts: z.array(partEstimateSchema),
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
  workDetails: z.object({
    technician: z.string(),
    partsUsed: z.string(),
    timeSpent: z.string(),
    notes: z.string(),
  }),
  history: z.array(z.object({
    status: requestStatus,
    by: z.string(),
    at: z.string(),
    note: z.string().nullable(),
  })),
});

export const telecomsRequestListSchema = z.object({
  items: z.array(telecomsRequestSchema),
});

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
  balance: z.number(),
  note: z.string().nullable(),
  requestId: z.string().nullable(),
  by: z.string(),
  at: z.string(),
});

export const equipmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetTag: z.string(),
  totalQuantity: z.number(),
  availableQuantity: z.number(),
  state: equipmentState,
  location: z.string(),
  note: z.string(),
  updatedAt: z.string(),
});

export const equipmentLoanSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  equipmentName: z.string(),
  quantity: z.number(),
  borrowerName: z.string(),
  borrowerType: z.string(),
  borrowerContact: z.string(),
  dateOut: z.string(),
  dateBack: z.string(),
  outgoingCondition: z.string(),
  incomingCondition: z.string().nullable(),
  status: loanStatus,
  managerApproval: z.object({
    approvedBy: z.string(),
    approvedAt: z.string(),
    note: z.string().nullable(),
  }).nullable(),
  createdAt: z.string(),
});

export const labBookingSchema = z.object({
  id: z.string(),
  purpose: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  groupSize: z.number(),
  bookedBy: z.string(),
  customerType: z.string(),
  status: z.enum(['CONFIRMED', 'CANCELLED']),
  paymentStatus: paymentStatus,
  createdAt: z.string(),
});

export const bootcampParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  studentNumber: z.string().nullable(),
  paymentStatus: paymentStatus,
  enrolledAt: z.string(),
});

export const bootcampSessionSchema = z.object({
  id: z.string(),
  topic: z.string(),
  instructor: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  capacity: z.number(),
  fee: z.number(),
  enrolled: z.array(bootcampParticipantSchema),
  attendance: z.array(z.object({
    participantId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT']),
  })),
});

export const timetableEntrySchema = z.object({
  id: z.string(),
  weekday: z.number(),
  start: z.string(),
  end: z.string(),
  label: z.string(),
});

export const telecomsApi = {
  requests: (token, signal) => request('/telecoms/requests', { token, signal, schema: telecomsRequestListSchema }).then((res) => res.items),
  request: (token, id, signal) => request(`/telecoms/requests/${encodeURIComponent(id)}`, { token, signal, schema: telecomsRequestSchema }),
  createRequest: (token, payload) => request('/telecoms/requests', { method: 'POST', body: payload, token, schema: telecomsRequestSchema }),
  updateDraft: (token, id, payload) => request(`/telecoms/requests/${encodeURIComponent(id)}/draft`, { method: 'PUT', body: payload, token, schema: telecomsRequestSchema }),
  sendQuote: (token, id, body) => request(`/telecoms/requests/${encodeURIComponent(id)}/quote`, { method: 'POST', body, token, schema: telecomsRequestSchema }),
  requestDetails: (token, id, message) => request(`/telecoms/requests/${encodeURIComponent(id)}/request-details`, { method: 'POST', body: { message }, token, schema: telecomsRequestSchema }),
  sendBack: (token, id, reason) => request(`/telecoms/requests/${encodeURIComponent(id)}/send-back`, { method: 'POST', body: { reason }, token, schema: telecomsRequestSchema }),
  updateStatus: (token, id, toStatus) => request(`/telecoms/requests/${encodeURIComponent(id)}/status`, { method: 'POST', body: { toStatus }, token, schema: telecomsRequestSchema }),
  updateWorkDetails: (token, id, body) => request(`/telecoms/requests/${encodeURIComponent(id)}/work-details`, { method: 'PUT', body, token, schema: telecomsRequestSchema }),
  markDone: (token, id) => request(`/telecoms/requests/${encodeURIComponent(id)}/mark-done`, { method: 'POST', token, schema: telecomsRequestSchema }),

  priceList: (token, signal) => request('/telecoms/price-list', { token, signal, schema: z.object({ items: z.array(priceListItemSchema) }) }).then((res) => res.items),
  stock: (token, signal) => request('/telecoms/stock', { token, signal, schema: z.object({ items: z.array(stockItemSchema) }) }).then((res) => res.items),
  movements: (token, signal) => request('/telecoms/stock/movements', { token, signal, schema: z.object({ items: z.array(stockMovementSchema) }) }).then((res) => res.items),
  recordMovement: (token, body) => request('/telecoms/stock/movements', { method: 'POST', body, token, schema: z.object({ movement: stockMovementSchema, item: stockItemSchema }) }),
  updateMinimum: (token, itemId, minimum) => request(`/telecoms/stock/${encodeURIComponent(itemId)}/minimum`, { method: 'PATCH', body: { minimum }, token, schema: stockItemSchema }),

  equipment: (token, signal) => request('/telecoms/equipment', { token, signal, schema: z.object({ items: z.array(equipmentItemSchema) }) }).then((res) => res.items),
  reportEquipmentFault: (token, body) => request('/telecoms/equipment/report-fault', { method: 'POST', body, token, schema: equipmentItemSchema }),
  loans: (token, signal) => request('/telecoms/equipment/loans', { token, signal, schema: z.object({ items: z.array(equipmentLoanSchema) }) }).then((res) => res.items),
  requestLoan: (token, body) => request('/telecoms/equipment/loans', { method: 'POST', body, token, schema: equipmentLoanSchema }),
  approveLoan: (token, loanId, note) => request(`/telecoms/equipment/loans/${encodeURIComponent(loanId)}/approve`, { method: 'POST', body: { note }, token, schema: equipmentLoanSchema }),
  declineLoan: (token, loanId, reason) => request(`/telecoms/equipment/loans/${encodeURIComponent(loanId)}/decline`, { method: 'POST', body: { reason }, token, schema: equipmentLoanSchema }),
  returnLoan: (token, loanId, condition) => request(`/telecoms/equipment/loans/${encodeURIComponent(loanId)}/return`, { method: 'POST', body: { condition }, token, schema: equipmentLoanSchema }),

  labBookings: (token, from, to, signal) => {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    return request(`/telecoms/lab-bookings?${query.toString()}`, {
      token, signal,
      schema: z.object({
        bookings: z.array(labBookingSchema),
        timetable: z.array(timetableEntrySchema),
      }),
    });
  },
  createLabBooking: (token, body) => request('/telecoms/lab-bookings', { method: 'POST', body, token, schema: labBookingSchema }),

  bootcamps: (token, signal) => request('/telecoms/bootcamps', { token, signal, schema: z.object({ items: z.array(bootcampSessionSchema) }) }).then((res) => res.items),
  createBootcamp: (token, body) => request('/telecoms/bootcamps', { method: 'POST', body, token, schema: bootcampSessionSchema }),
  enrollBootcamp: (token, sessionId, body) => request(`/telecoms/bootcamps/${encodeURIComponent(sessionId)}/enroll`, { method: 'POST', body, token, schema: bootcampSessionSchema }),
  saveAttendance: (token, sessionId, attendance) => request(`/telecoms/bootcamps/${encodeURIComponent(sessionId)}/attendance`, { method: 'POST', body: { attendance }, token, schema: bootcampSessionSchema }),
};
