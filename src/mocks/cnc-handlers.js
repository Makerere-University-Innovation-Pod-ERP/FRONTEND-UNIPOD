import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { CNC_MOVEMENT_TYPES, evaluateCncMovement } from '@/lib/cnc';
import { initialCncStockItems, initialCncStockMovements } from './fixtures/cnc';
import { cncState } from './cnc-state';

const base = `${API_BASE_URL}/cnc/stock`;
const now = () => new Date().toISOString();

function actor(request) {
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.name || payload.sub || 'Unknown user';
  } catch {
    return 'Unknown user';
  }
}

const problem = (status, detail) => HttpResponse.json({ title: 'Request rejected', status, detail }, { status });

let itemSequence = 1;
let movementSequence = 4;

export const cncStockHandlers = [
  http.get(base, () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const movementsThisWeek = initialCncStockMovements.filter((movement) => new Date(movement.at).getTime() >= weekAgo).length;
    return HttpResponse.json({ items: initialCncStockItems, movementsThisWeek });
  }),

  http.post(base, async ({ request }) => {
    const body = await request.json();
    if (!body.name?.trim() || !body.unit?.trim() || !body.location?.trim()) {
      return problem(400, 'Name, unit and location are required.');
    }
    if (!Number.isFinite(body.quantity) || body.quantity < 0 || !Number.isFinite(body.minimum) || body.minimum < 0) {
      return problem(400, 'Quantity and minimum must be zero or more.');
    }
    const item = {
      id: `cnc-stk-${itemSequence++}`,
      name: body.name.trim(),
      unit: body.unit.trim(),
      quantity: body.quantity,
      minimum: body.minimum,
      location: body.location.trim(),
    };
    initialCncStockItems.unshift(item);
    if (item.quantity > 0) {
      initialCncStockMovements.unshift({
        id: `cnc-mv-${movementSequence++}`,
        itemId: item.id,
        itemName: item.name,
        type: CNC_MOVEMENT_TYPES.RECEIVED,
        quantity: item.quantity,
        balanceAfter: item.quantity,
        jobId: null,
        jobCode: null,
        note: 'Opening stock',
        by: actor(request),
        at: now(),
      });
    }
    return HttpResponse.json(item, { status: 201 });
  }),

  http.get(`${base}/movements`, () => HttpResponse.json({ items: initialCncStockMovements })),

  http.post(`${base}/movements`, async ({ request }) => {
    const body = await request.json();
    if (body.type === CNC_MOVEMENT_TYPES.USED_ON_ORDER) {
      const matchingJob = cncState.jobs.find((candidate) => candidate.id === body.jobId);
      if (!matchingJob) return problem(400, 'That job does not exist.');
    }
    const item = initialCncStockItems.find((candidate) => candidate.id === body.itemId);
    const { error, balance } = evaluateCncMovement(item, body);
    if (error) return problem(item && error.includes('below zero') ? 409 : 400, error);
    const job = cncState.jobs.find((candidate) => candidate.id === body.jobId);
    item.quantity = balance;
    const movement = {
      id: `cnc-mv-${movementSequence++}`,
      itemId: item.id,
      itemName: item.name,
      type: body.type,
      quantity: body.quantity,
      balanceAfter: balance,
      jobId: body.jobId ?? null,
      jobCode: job?.code ?? null,
      note: body.note?.trim() ?? '',
      by: actor(request),
      at: now(),
    };
    initialCncStockMovements.unshift(movement);
    return HttpResponse.json({ movement, item }, { status: 201 });
  }),

  http.patch(`${base}/:id`, async ({ params, request }) => {
    const item = initialCncStockItems.find((candidate) => candidate.id === params.id);
    if (!item) return problem(404, 'Stock item not found.');
    const { minimum } = await request.json();
    if (!Number.isFinite(minimum) || minimum < 0) return problem(400, 'The minimum must be zero or more.');
    item.minimum = minimum;
    return HttpResponse.json(item);
  }),
];
