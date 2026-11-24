import { z } from 'zod';
import { request } from './api-client';

export const CNC_STAGES = ['NEW', 'QUOTED', 'PAYMENT_GATE', 'SCHEDULED', 'IN_PRODUCTION', 'READY', 'COLLECTED'];
export const PAID_INVOICE_STATUSES = ['PAID', 'RECEIPTED'];

const materialSchema = z.object({
  name: z.string().nullish(),
  qty: z.number().nullish(),
  unit: z.string().nullish(),
}).passthrough();

const historySchema = z.object({
  stage: z.string(),
  at: z.string(),
  by: z.string().nullish(),
  notes: z.string().nullish(),
}).passthrough();

export const cncJobSchema = z.object({
  id: z.string(),
  code: z.string(),
  department: z.string(),
  customerId: z.string().nullish(),
  title: z.string(),
  quantity: z.number(),
  dateNeeded: z.string().nullish(),
  acceptedRulesVersion: z.string().nullish(),
  stage: z.string(),
  specs: z.record(z.string(), z.unknown()).nullish().transform((value) => value ?? {}),
  quote: z.object({
    amount: z.number(),
    description: z.string().nullish(),
    expectedCompletion: z.string().nullish(),
  }).passthrough().nullish(),
  quoteSubmittedAt: z.string().nullish(),
  quotedBy: z.string().nullish(),
  invoiceId: z.string().nullish(),
  invoiceStatus: z.string().nullish(),
  materialsUsed: z.array(materialSchema).nullish().transform((value) => value ?? []),
  paymentConfirmedAt: z.string().nullish(),
  machineTimeUsed: z.string().nullish(),
  qualityChecklist: z.record(z.string(), z.unknown()).nullish(),
  collectionSignature: z.string().nullish(),
  stageHistory: z.array(historySchema).nullish().transform((value) => value ?? []),
  createdBy: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
});

const kanbanSchema = z.object({
  department: z.string(),
  columns: z.record(z.string(), z.array(cncJobSchema)),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
});

export const priceItemSchema = z.object({
  id: z.string(),
  departmentId: z.string().nullish(),
  service: z.string(),
  unit: z.string(),
  priceUgx: z.number(),
  effectiveFrom: z.string().nullish(),
  status: z.string(),
});

export const cncStockItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  quantity: z.number(),
  minimum: z.number(),
  location: z.string(),
});

export const cncStockMovementSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  type: z.enum(['RECEIVED', 'USED_ON_ORDER', 'CORRECTION']),
  quantity: z.number(),
  balanceAfter: z.number(),
  jobId: z.string().nullable(),
  jobCode: z.string().nullable(),
  note: z.string(),
  by: z.string(),
  at: z.string(),
});

const cncStockListSchema = z.object({
  items: z.array(cncStockItemSchema),
  movementsThisWeek: z.number(),
});

const cncMovementResultSchema = z.object({
  movement: cncStockMovementSchema,
  item: cncStockItemSchema,
});

const base = '/departments/cnc/orders';
const stockBase = '/cnc/stock';

export const cncApi = {
  async jobs(token, signal) {
    const board = kanbanSchema.parse(await request(`${base}?size=100`, { token, signal }));
    return CNC_STAGES.flatMap((stage) => board.columns[stage] ?? [])
      .concat(Object.entries(board.columns).filter(([stage]) => !CNC_STAGES.includes(stage)).flatMap(([, jobs]) => jobs));
  },

  /**
   * @param {{title: string, quantity: number, dateNeeded?: string, acceptedRulesVersion?: string,
   *   specs: {whatIsMade: string, material: string, size: string, designLink?: string, customerName?: string,
   *   customerType?: string, contact?: string, notes?: string}}} job
   */
  async create(job, token, signal) {
    const body = {
      title: job.title,
      quantity: job.quantity,
      specs: job.specs,
      ...(job.dateNeeded ? { date_needed: job.dateNeeded } : {}),
      ...(job.acceptedRulesVersion ? { accepted_rules_version: job.acceptedRulesVersion } : {}),
    };
    return cncJobSchema.parse(await request(base, { method: 'POST', body, token, signal }));
  },

  /** @param {{amount: number, description: string, customerEmail?: string, customerName?: string, expectedCompletion?: string, designCheck?: object}} quote */
  async quote(id, quote, token, signal) {
    return cncJobSchema.parse(
      await request(`${base}/${encodeURIComponent(id)}/quote`, { method: 'POST', body: { quote }, token, signal }),
    );
  },

  /**
   * @param {{stage: string, notes?: string, materialsUsed?: object[], machineTimeUsed?: string,
   *   qualityChecklist?: object, collectionSignature?: string}} change
   */
  async moveStage(id, change, token, signal) {
    const body = {
      stage: change.stage,
      ...(change.notes ? { notes: change.notes } : {}),
      ...(change.materialsUsed ? { materials_used: change.materialsUsed } : {}),
      ...(change.machineTimeUsed ? { machine_time_used: change.machineTimeUsed } : {}),
      ...(change.qualityChecklist ? { quality_checklist: change.qualityChecklist } : {}),
      ...(change.collectionSignature ? { collection_signature: change.collectionSignature } : {}),
    };
    return cncJobSchema.parse(
      await request(`${base}/${encodeURIComponent(id)}/stage`, { method: 'PATCH', body, token, signal }),
    );
  },

  async priceList(departmentId, token, signal) {
    const params = new URLSearchParams({ status: 'ACTIVE' });
    if (departmentId) params.set('departmentId', departmentId);
    return z.array(priceItemSchema).parse(await request(`/price-list-items?${params}`, { token, signal }));
  },

  async stock(token, signal) {
    return cncStockListSchema.parse(await request(stockBase, { token, signal }));
  },

  async registerStockItem(item, token) {
    return cncStockItemSchema.parse(await request(stockBase, { method: 'POST', body: item, token }));
  },

  async stockMovements(token, signal) {
    return z.object({ items: z.array(cncStockMovementSchema) })
      .parse(await request(`${stockBase}/movements`, { token, signal })).items;
  },

  async recordStockMovement(body, token) {
    return cncMovementResultSchema.parse(await request(`${stockBase}/movements`, { method: 'POST', body, token }));
  },

  async updateStockMinimum(id, minimum, token) {
    return cncStockItemSchema.parse(await request(`${stockBase}/${encodeURIComponent(id)}`, {
      method: 'PATCH', body: { minimum }, token,
    }));
  },

  async setFacilityStatus(id, status, token, signal) {
    return request(`/facilities/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status }, token, signal });
  },
};

export function isPaid(job) {
  return PAID_INVOICE_STATUSES.includes(job.invoiceStatus ?? '');
}

export function isCncFacility(facility) {
  return /cnc|carpentry|wood/i.test(`${facility.department ?? ''} ${facility.name}`);
}
