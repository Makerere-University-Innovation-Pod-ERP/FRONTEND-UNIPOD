import { z } from 'zod';
import { request } from './api-client';

export const equipmentStateSchema = z.enum([
  'AVAILABLE', 'IN_USE', 'LOANED', 'UNDER_MAINTENANCE', 'FAULTY',
]);

export const loanStatusSchema = z.enum([
  'PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'ACTIVE', 'RETURNED',
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
  status: loanStatusSchema,
  managerApproval: z.object({
    approvedBy: z.string(),
    approvedAt: z.string(),
    note: z.string().nullable(),
  }).nullable(),
  createdAt: z.string(),
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

  async loans(token, signal) {
    const data = await request('/operations/equipment/loans', { token, signal });
    return z.array(equipmentLoanSchema).parse(data);
  },

  async requestLoan(body, token, signal) {
    const data = await request('/operations/equipment/loans', {
      method: 'POST',
      body,
      token,
      signal,
    });
    return equipmentLoanSchema.parse(data);
  },

  async approveLoan(loanId, note, token, signal) {
    const data = await request(`/operations/equipment/loans/${encodeURIComponent(loanId)}/approve`, {
      method: 'POST',
      body: { note },
      token,
      signal,
    });
    return equipmentLoanSchema.parse(data);
  },

  async declineLoan(loanId, reason, token, signal) {
    const data = await request(`/operations/equipment/loans/${encodeURIComponent(loanId)}/decline`, {
      method: 'POST',
      body: { reason },
      token,
      signal,
    });
    return equipmentLoanSchema.parse(data);
  },

  async returnLoan(loanId, condition, token, signal) {
    const data = await request(`/operations/equipment/loans/${encodeURIComponent(loanId)}/return`, {
      method: 'POST',
      body: { condition },
      token,
      signal,
    });
    return equipmentLoanSchema.parse(data);
  },
};
