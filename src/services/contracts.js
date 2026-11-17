import { z } from 'zod';
import { request } from './api-client';

export const CONTRACT_STATUSES = ['DRAFT', 'SIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const CONTRACT_TRANSITIONS = {
  DRAFT: ['SIGNED', 'CANCELLED'],
  SIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const milestoneSchema = z.object({
  label: z.string().nullish(),
  date: z.string().nullish(),
  amount: z.number().nullish(),
});

export const eventContractSchema = z.object({
  id: z.string(),
  code: z.string(),
  client: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  venue: z.string().nullish(),
  agreedPrice: z.number(),
  currency: z.string().default('UGX'),
  milestonePaymentDates: z.array(z.union([milestoneSchema, z.string()])).nullish().transform((value) => value ?? []),
  signedContractDocId: z.string().nullish(),
  assignedStaff: z.array(z.unknown()).nullish().transform((value) => (value ?? []).map(String)),
  status: z.enum(CONTRACT_STATUSES),
  invoiceIds: z.array(z.string()).nullish().transform((value) => value ?? []),
  createdBy: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
});

export const contractsApi = {
  async list(token, signal) {
    return z.array(eventContractSchema).parse(await request('/media/contracts', { token, signal }));
  },

  /**
   * @param {{client: string, eventName: string, eventDate: string, venue?: string, agreedPrice: number,
   *   milestones?: {label: string, date: string, amount?: number}[], assignedStaff?: string[],
   *   signedContractDocId?: string}} contract
   */
  async create(contract, token, signal) {
    const body = {
      client: contract.client,
      event_name: contract.eventName,
      event_date: contract.eventDate,
      venue: contract.venue || undefined,
      agreed_price: contract.agreedPrice,
      currency: 'UGX',
      milestone_payment_dates: contract.milestones?.length ? contract.milestones : undefined,
      assigned_staff: contract.assignedStaff?.length ? contract.assignedStaff : undefined,
      signed_contract_doc_id: contract.signedContractDocId || undefined,
    };
    return eventContractSchema.parse(await request('/media/contracts', { method: 'POST', body, token, signal }));
  },

  async transition(id, status, signedContractDocId, token, signal) {
    return eventContractSchema.parse(
      await request(`/media/contracts/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: { status, ...(signedContractDocId ? { signed_contract_doc_id: signedContractDocId } : {}) },
        token,
        signal,
      }),
    );
  },
};
