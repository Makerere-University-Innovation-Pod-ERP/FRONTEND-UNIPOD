import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import {
  ORDER_STATUS, assessMaterials, evaluateMovement, findBookingClashes, isChecklistComplete,
  MACHINE_STATE, MOVEMENT_TYPES, ORDER_STATUS_LABELS, transitionError,
} from '@/lib/textile';
import {
  bookings, classTimetable, defaultQualityChecklist, machines, orders, priceList,
  stockItems, stockMovements, textileManagers,
} from './fixtures/textile';
import { notifications } from './fixtures/notifications';

/**
 * Mock implementation of the proposed /textile/* contract (services/textile.js).
 * It enforces the same rules the real backend must: 409 when scheduling an
 * unpaid order, when a stock movement would go below zero, when a booking
 * clashes or uses a machine that is not Working.
 */

const base = `${API_BASE_URL}/textile`;
const now = () => new Date().toISOString();

/** Reads the display name out of the mock bearer token so every write is attributed. */
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
const findOrder = (id) => orders.find((order) => order.id === id);

function touch(order, status, by, note = null) {
  const at = now();
  order.updatedAt = at;
  if (status !== order.status || note) order.history.push({ status, by, at, note });
  order.status = status;
}

async function readMultipart(request, partName) {
  const form = await request.formData();
  const part = form.get(partName);
  const json = JSON.parse(typeof part === 'string' ? part : await part.text());
  const photo = form.get('photo');
  return { json, photo: photo && typeof photo !== 'string' ? photo : null };
}

const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function photoError(photo) {
  if (!photo) return null;
  if (!PHOTO_TYPES.includes(photo.type)) return 'The photo must be a JPG or PNG image.';
  if (photo.size > MAX_PHOTO_BYTES) return 'The photo must be 15 MB or smaller.';
  return null;
}

function orderFieldsError(order, submitting) {
  if (!submitting) return order.customerName?.trim() ? null : 'A draft needs at least the customer name.';
  for (const field of ['customerName', 'customerType', 'whatIsWanted', 'quantity', 'sizeDesign']) {
    if (!String(order[field] ?? '').trim()) return 'Fill in every required field before sending the order.';
  }
  if (!order.rulesAccepted) return "The customer must accept the Textile department's rules.";
  return null;
}

let orderSequence = 18;
let movementSequence = 12;
let reportSequence = 1;
let bookingSequence = 3;
let attendeeSequence = 4;

export const textileHandlers = [
  http.get(`${base}/orders`, () => HttpResponse.json({ items: orders })),

  http.get(`${base}/orders/:id`, ({ params }) => {
    const order = findOrder(params.id);
    return order ? HttpResponse.json(order) : problem(404, 'Order not found.');
  }),

  http.post(`${base}/orders`, async ({ request }) => {
    const { json, photo } = await readMultipart(request, 'order');
    const error = photoError(photo) ?? orderFieldsError(json, json.submit);
    if (error) return problem(400, error);
    const by = actor(request);
    const code = `TXO-2026-${String(orderSequence++).padStart(3, '0')}`;
    const status = json.submit ? ORDER_STATUS.NEW : ORDER_STATUS.DRAFT;
    const at = now();
    const order = {
      id: code,
      code: json.submit ? code : null,
      customerName: json.customerName.trim(),
      customerType: json.customerType || 'Public',
      whatIsWanted: json.whatIsWanted ?? '',
      quantity: json.quantity ?? '',
      sizeDesign: json.sizeDesign ?? '',
      dateNeeded: json.dateNeeded || null,
      photo: photo ? { name: photo.name, url: null } : null,
      rulesAccepted: Boolean(json.rulesAccepted),
      status,
      createdAt: at,
      updatedAt: at,
      estimate: null,
      quote: null,
      payment: { status: 'NOT_REQUESTED', reference: null, confirmedAt: null },
      production: { materialUsed: '', machineId: null, staff: '', notes: '' },
      qualityChecklist: defaultQualityChecklist(),
      collection: null,
      history: [{ status, by, at, note: json.submit ? 'Order sent to Textile' : 'Draft saved' }],
    };
    orders.unshift(order);
    return HttpResponse.json(order, { status: 201 });
  }),

  http.put(`${base}/orders/:id`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    if (order.status !== ORDER_STATUS.DRAFT) return problem(409, 'Only a draft order can be edited.');
    const { json, photo } = await readMultipart(request, 'order');
    const error = photoError(photo) ?? orderFieldsError(json, json.submit);
    if (error) return problem(400, error);
    Object.assign(order, {
      customerName: json.customerName.trim(),
      customerType: json.customerType,
      whatIsWanted: json.whatIsWanted,
      quantity: json.quantity,
      sizeDesign: json.sizeDesign,
      dateNeeded: json.dateNeeded || null,
      rulesAccepted: Boolean(json.rulesAccepted),
      ...(photo ? { photo: { name: photo.name, url: null } } : {}),
    });
    if (json.submit) {
      order.code = order.id;
      touch(order, ORDER_STATUS.NEW, actor(request), 'Order sent to Textile');
    } else {
      order.updatedAt = now();
    }
    return HttpResponse.json(order);
  }),

  http.post(`${base}/orders/:id/quote`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    if (![ORDER_STATUS.NEW, ORDER_STATUS.AWAITING_DETAILS].includes(order.status)) {
      return problem(409, `A quote cannot be sent for an order that is ${ORDER_STATUS_LABELS[order.status]}.`);
    }
    const body = await request.json();
    const price = priceList.find((item) => item.id === body.priceListItemId);
    if (!price) return problem(400, 'Choose an item from the Textile price list.');
    if (!(body.priceQuantity > 0)) return problem(400, 'Enter a quantity to price.');
    if (!body.expectedCompletion) return problem(400, 'Set an expected completion date.');
    const shortfall = assessMaterials(body.materials ?? [], stockItems).find((line) => !line.sufficient);
    if (shortfall) return problem(409, `Not enough ${shortfall.item?.name ?? 'stock'} to take this order.`);
    const by = actor(request);
    order.estimate = { materials: body.materials, priceListItemId: price.id, priceQuantity: body.priceQuantity };
    order.quote = {
      amount: price.unitPrice * body.priceQuantity,
      currency: 'UGX',
      priceListItemId: price.id,
      priceQuantity: body.priceQuantity,
      expectedCompletion: body.expectedCompletion,
      sentAt: now(),
      sentBy: by,
    };
    order.payment = { status: 'AWAITING_PROOF', reference: null, confirmedAt: null };
    touch(order, ORDER_STATUS.QUOTED, by, `Quote UGX ${order.quote.amount.toLocaleString('en-US')} sent`);
    return HttpResponse.json(order);
  }),

  http.post(`${base}/orders/:id/request-details`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    const { message } = await request.json();
    if (!message?.trim()) return problem(400, 'Say what details the customer needs to provide.');
    touch(order, ORDER_STATUS.AWAITING_DETAILS, actor(request), message.trim());
    return HttpResponse.json(order);
  }),

  http.post(`${base}/orders/:id/send-back`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    const { reason } = await request.json();
    if (!reason?.trim()) return problem(400, 'Give reception a reason for sending the order back.');
    touch(order, ORDER_STATUS.RETURNED, actor(request), reason.trim());
    return HttpResponse.json(order);
  }),

  http.post(`${base}/orders/:id/transitions`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    const { toStatus } = await request.json();
    const error = transitionError(order, toStatus);
    if (error) return problem(409, error);
    touch(order, toStatus, actor(request), toStatus === ORDER_STATUS.SCHEDULED ? `Payment ${order.payment.reference ?? ''} confirmed`.trim() : null);
    return HttpResponse.json(order);
  }),

  http.put(`${base}/orders/:id/production`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    const body = await request.json();
    if (body.machineId) {
      const machine = machines.find((candidate) => candidate.id === body.machineId);
      if (machine?.state !== MACHINE_STATE.WORKING && body.machineId !== order.production.machineId) {
        return problem(409, `${machine?.name ?? 'That machine'} cannot be used until it is marked Working again.`);
      }
    }
    order.production = {
      materialUsed: body.materialUsed ?? '',
      machineId: body.machineId || null,
      staff: body.staff ?? '',
      notes: body.notes ?? '',
    };
    order.updatedAt = now();
    return HttpResponse.json(order);
  }),

  http.put(`${base}/orders/:id/quality`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    const { checklist } = await request.json();
    order.qualityChecklist = order.qualityChecklist.map((item) => ({
      ...item,
      checked: Boolean(checklist.find((candidate) => candidate.id === item.id)?.checked),
    }));
    order.updatedAt = now();
    return HttpResponse.json(order);
  }),

  http.post(`${base}/orders/:id/collection`, async ({ params, request }) => {
    const order = findOrder(params.id);
    if (!order) return problem(404, 'Order not found.');
    if (order.status !== ORDER_STATUS.READY) return problem(409, 'Only an order that is Ready can be collected.');
    if (!isChecklistComplete(order.qualityChecklist)) return problem(409, 'The quality checklist is not complete.');
    const { collectedBy } = await request.json();
    if (!collectedBy?.trim()) return problem(400, 'Record who collected the order.');
    const by = actor(request);
    order.collection = { collectedBy: collectedBy.trim(), collectedAt: now(), recordedBy: by };
    touch(order, ORDER_STATUS.COLLECTED, by, `Collected by ${collectedBy.trim()}`);
    return HttpResponse.json(order);
  }),

  /*
   * DEMO ONLY — not part of the /textile contract and never sent to the real
   * backend. Stands in for the shared Finance screens (Assignment 6), which
   * confirm payment against the order code, so a quoted order can be taken
   * through Scheduled → Collected in mock mode.
   */
  http.post(`${API_BASE_URL}/__demo__/finance/confirm-payment`, async ({ request }) => {
    const { orderId } = await request.json();
    const order = findOrder(orderId);
    if (!order) return problem(404, 'Order not found.');
    if (order.status !== ORDER_STATUS.QUOTED) return problem(409, 'Only a quoted order can have its payment confirmed.');
    order.payment = { status: 'CONFIRMED', reference: `FIN-DEMO-${order.code?.slice(-3) ?? '000'}`, confirmedAt: now() };
    order.updatedAt = now();
    return HttpResponse.json(order);
  }),

  http.get(`${base}/price-list`, () => HttpResponse.json({ items: priceList })),

  http.get(`${base}/stock`, () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const movementsThisWeek = stockMovements.filter((movement) => new Date(movement.at).getTime() >= weekAgo).length;
    return HttpResponse.json({ items: stockItems, movementsThisWeek });
  }),

  http.patch(`${base}/stock/:id`, async ({ params, request }) => {
    const item = stockItems.find((candidate) => candidate.id === params.id);
    if (!item) return problem(404, 'Stock item not found.');
    const { minimum } = await request.json();
    if (!Number.isFinite(minimum) || minimum < 0) return problem(400, 'The minimum must be zero or more.');
    item.minimum = minimum;
    return HttpResponse.json(item);
  }),

  http.get(`${base}/stock/movements`, () => HttpResponse.json({ items: stockMovements })),

  http.post(`${base}/stock/movements`, async ({ request }) => {
    const body = await request.json();
    const item = stockItems.find((candidate) => candidate.id === body.itemId);
    const order = body.orderId ? findOrder(body.orderId) : null;
    const { error, balance } = evaluateMovement(item, body);
    if (error) return problem(item && error.includes('below zero') ? 409 : 400, error);
    if (body.type === MOVEMENT_TYPES.USED_ON_ORDER && !order) return problem(400, 'That order does not exist.');
    item.quantity = balance;
    const movement = {
      id: `mv-${movementSequence++}`,
      itemId: item.id,
      itemName: item.name,
      type: body.type,
      quantity: body.quantity,
      balanceAfter: balance,
      orderId: order?.id ?? null,
      orderCode: order?.code ?? null,
      note: body.note?.trim() ?? '',
      by: actor(request),
      at: now(),
    };
    stockMovements.unshift(movement);
    return HttpResponse.json({ movement, item }, { status: 201 });
  }),

  http.get(`${base}/machines`, () => HttpResponse.json({ items: machines })),

  http.post(`${base}/machines/:id/reports`, async ({ params, request }) => {
    const machine = machines.find((candidate) => candidate.id === params.id);
    if (!machine) return problem(404, 'Machine not found.');
    const { json, photo } = await readMultipart(request, 'report');
    const error = photoError(photo);
    if (error) return problem(400, error);
    if (!json.description?.trim()) return problem(400, 'Describe the fault or service needed.');
    const by = actor(request);
    const kind = json.kind === 'SERVICE' ? 'SERVICE' : 'FAULT';
    machine.state = kind === 'SERVICE' ? MACHINE_STATE.SERVICE_DUE : MACHINE_STATE.FAULT_REPORTED;
    machine.note = json.description.trim();
    machine.updatedAt = now();
    const report = { id: `rp-${reportSequence++}`, kind, description: json.description.trim(), photo: photo ? { name: photo.name } : null, by, at: now() };
    notifications.unshift({
      id: `n-textile-${report.id}`,
      title: `${kind === 'SERVICE' ? 'Service due' : 'Fault reported'}: ${machine.name}`,
      body: `${by}: ${report.description}`,
      link: '/textile/machines',
      createdAt: now().slice(0, 10),
      read: false,
    });
    return HttpResponse.json({ machine, report, managersNotified: textileManagers }, { status: 201 });
  }),

  http.post(`${base}/machines/:id/mark-working`, async ({ params, request }) => {
    const machine = machines.find((candidate) => candidate.id === params.id);
    if (!machine) return problem(404, 'Machine not found.');
    const { note } = await request.json();
    machine.state = MACHINE_STATE.WORKING;
    machine.note = note?.trim() || `Marked working by ${actor(request)}`;
    machine.updatedAt = now();
    return HttpResponse.json(machine);
  }),

  http.get(`${base}/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? '0000-00-00';
    const to = url.searchParams.get('to') ?? '9999-99-99';
    return HttpResponse.json({
      bookings: bookings.filter((booking) => booking.date >= from && booking.date <= to),
      timetable: classTimetable,
    });
  }),

  http.post(`${base}/bookings`, async ({ request }) => {
    const body = await request.json();
    if (!body.date || !body.start || !body.end || !body.purpose?.trim()) return problem(400, 'Date, time and purpose are required.');
    const clashes = findBookingClashes(body, { bookings, timetable: classTimetable, machines });
    if (clashes.length) return problem(409, clashes.map((clash) => clash.message).join(' '));
    const booking = {
      id: `bk-${bookingSequence++}`,
      kind: body.kind === 'TRAINING' ? 'TRAINING' : 'WORKSHOP',
      date: body.date,
      start: body.start,
      end: body.end,
      purpose: body.purpose.trim(),
      machineId: body.machineId || null,
      capacity: body.kind === 'TRAINING' ? Number(body.capacity) || null : null,
      bookedBy: actor(request),
      status: 'APPROVED',
      attendees: [],
    };
    bookings.push(booking);
    return HttpResponse.json(booking, { status: 201 });
  }),

  http.post(`${base}/bookings/:id/cancel`, async ({ params, request }) => {
    const booking = bookings.find((candidate) => candidate.id === params.id);
    if (!booking) return problem(404, 'Booking not found.');
    if (booking.status === 'CANCELLED') return problem(409, 'This booking is already cancelled.');
    const { reason } = await request.json();
    if (!reason?.trim()) return problem(400, 'Give a reason for cancelling.');
    booking.status = 'CANCELLED';
    booking.cancellation = { reason: reason.trim(), by: actor(request), at: now() };
    return HttpResponse.json(booking);
  }),

  http.post(`${base}/bookings/:id/attendees`, async ({ params, request }) => {
    const booking = bookings.find((candidate) => candidate.id === params.id);
    if (!booking) return problem(404, 'Booking not found.');
    if (booking.kind !== 'TRAINING') return problem(409, 'Only training sessions take sign-ups.');
    const { name } = await request.json();
    if (!name?.trim()) return problem(400, 'Enter the participant’s name.');
    if (booking.capacity && booking.attendees.length >= booking.capacity) return problem(409, 'This session is full.');
    booking.attendees.push({ id: `at-${attendeeSequence++}`, name: name.trim(), attended: false });
    return HttpResponse.json(booking, { status: 201 });
  }),

  http.put(`${base}/bookings/:id/attendees/:attendeeId`, async ({ params, request }) => {
    const booking = bookings.find((candidate) => candidate.id === params.id);
    const attendee = booking?.attendees.find((candidate) => candidate.id === params.attendeeId);
    if (!attendee) return problem(404, 'Participant not found.');
    const { attended } = await request.json();
    attendee.attended = Boolean(attended);
    return HttpResponse.json(booking);
  }),
];
