// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { textileApi } from './textile';
import { ApiError, request } from './api-client';
import { makeMockToken } from '@/mocks/jwt';
import { addDays, startOfWeek, todayIso } from '@/lib/textile';

/**
 * Contract tests: every textile service call goes through the MSW mock
 * backend, so these check the zod schemas against the mock payloads and that
 * the server side enforces the acceptance criteria (not only the UI).
 */
const token = makeMockToken(['ROLE_TEXTILE_DOMAIN_OWNER'], 'Faith Nabwire');

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to be rejected');
}

describe('textile API contract', () => {
  it('lists orders and loads one order', async () => {
    const orders = await textileApi.orders(token);
    expect(orders.length).toBeGreaterThanOrEqual(7);
    const order = await textileApi.order(token, 'TXO-2026-014');
    expect(order.production.machineId).toBe('mch-sew-1');
  });

  it('creates an order with a photo as multipart and attributes it', async () => {
    const photo = new File(['fake-jpeg'], 'design-reference.jpg', { type: 'image/jpeg' });
    const created = await textileApi.createOrder(token, {
      order: {
        customerName: 'Robert Ssali', customerType: 'Public', whatIsWanted: 'Cushion covers', quantity: '4',
        sizeDesign: '45 × 45 cm', dateNeeded: null, rulesAccepted: true, submit: true,
      },
      photo,
    });
    expect(created.status).toBe('NEW');
    expect(created.photo?.name).toBe('design-reference.jpg');
    expect(created.history[0].by).toBe('Faith Nabwire');
  });

  it('rejects an order sent without accepting the department rules', async () => {
    const error = await rejection(textileApi.createOrder(token, {
      order: { customerName: 'A', customerType: 'Public', whatIsWanted: 'B', quantity: '1', sizeDesign: 'C', rulesAccepted: false, submit: true },
    }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
  });

  it('saves a draft with only a customer name, then sends it', async () => {
    const draft = await textileApi.createOrder(token, { order: { customerName: 'Draft Customer', submit: false } });
    expect(draft.status).toBe('DRAFT');
    expect(draft.code).toBeNull();
    const sent = await textileApi.updateDraft(token, draft.id, {
      order: { customerName: 'Draft Customer', customerType: 'Staff', whatIsWanted: 'Gown repair', quantity: '1', sizeDesign: 'Hem', rulesAccepted: true, submit: true },
    });
    expect(sent.status).toBe('NEW');
    expect(sent.code).toBe(draft.id);
  });

  it('refuses to schedule an order whose payment is not confirmed (409)', async () => {
    const error = await rejection(textileApi.transition(token, 'TXO-2026-017', 'SCHEDULED'));
    expect(error.status).toBe(409);
    expect(error.message).toMatch(/Finance confirms payment/);
  });

  it('sends a quote from the price list, which then waits for payment proof', async () => {
    const quoted = await textileApi.sendQuote(token, 'TXO-2026-015', {
      materials: [{ itemId: 'stk-cotton', quantity: 9 }],
      priceListItemId: 'price-curtain',
      priceQuantity: 1,
      expectedCompletion: '2026-11-18',
    });
    expect(quoted.status).toBe('QUOTED');
    expect(quoted.quote.amount).toBe(185000);
    expect(quoted.payment.status).toBe('AWAITING_PROOF');
    expect((await rejection(textileApi.transition(token, quoted.id, 'SCHEDULED'))).status).toBe(409);
  });

  it('lets the demo-only Finance stand-in confirm payment so the order can be scheduled', async () => {
    const confirmed = await request('/__demo__/finance/confirm-payment', { token, body: { orderId: 'TXO-2026-015' } });
    expect(confirmed.payment.status).toBe('CONFIRMED');
    const scheduled = await textileApi.transition(token, 'TXO-2026-015', 'SCHEDULED');
    expect(scheduled.status).toBe('SCHEDULED');
  });

  it('refuses a quote whose repeated material lines add up to more than the stock', async () => {
    const order = await textileApi.createOrder(token, {
      order: { customerName: 'Grace A', customerType: 'Student', whatIsWanted: 'Banners', quantity: '2', sizeDesign: '2 m', rulesAccepted: true, submit: true },
    });
    // 50 m + 50 m of cotton, but only 86 m in stock.
    const error = await rejection(textileApi.sendQuote(token, order.id, {
      materials: [{ itemId: 'stk-cotton', quantity: 50 }, { itemId: 'stk-cotton', quantity: 50 }],
      priceListItemId: 'price-curtain',
      priceQuantity: 1,
      expectedCompletion: addDays(todayIso(), 7),
    }));
    expect(error.status).toBe(409);
  });

  it('refuses a stock movement below zero and attributes accepted ones', async () => {
    const error = await rejection(textileApi.recordMovement(token, { itemId: 'stk-zips', type: 'USED_ON_ORDER', quantity: 1000, orderId: 'TXO-2026-014', note: '' }));
    expect(error.status).toBe(409);
    const { movement, item } = await textileApi.recordMovement(token, { itemId: 'stk-zips', type: 'RECEIVED', quantity: 10, orderId: null, note: 'DN-1' });
    expect(movement.by).toBe('Faith Nabwire');
    expect(movement.at).toBeTruthy();
    expect(item.quantity).toBe(movement.balanceAfter);
  });

  it('takes a reported machine out of service and refuses to book it until marked Working', async () => {
    const result = await textileApi.reportFault(token, 'mch-cutting', { report: { kind: 'FAULT', description: 'Blade guard loose' } });
    expect(result.machine.state).toBe('FAULT_REPORTED');
    expect(result.managersNotified.length).toBeGreaterThan(0);

    const date = addDays(startOfWeek(todayIso()), 12); // a Saturday — clear of the class timetable
    const booking = { kind: 'WORKSHOP', date, start: '09:00', end: '10:00', purpose: 'Cutting practice', machineId: 'mch-cutting', capacity: null };
    expect((await rejection(textileApi.createBooking(token, booking))).status).toBe(409);

    await textileApi.markWorking(token, 'mch-cutting', 'Guard tightened');
    const created = await textileApi.createBooking(token, booking);
    expect(created.bookedBy).toBe('Faith Nabwire');
    expect((await rejection(textileApi.createBooking(token, booking))).message).toMatch(/Clashes with/);
  });

  it('refuses a booking that clashes with the class timetable', async () => {
    const monday = addDays(startOfWeek(todayIso()), 14);
    const error = await rejection(textileApi.createBooking(token, { kind: 'WORKSHOP', date: monday, start: '10:00', end: '11:00', purpose: 'Practice', machineId: null }));
    expect(error.status).toBe(409);
    expect(error.message).toMatch(/class timetable/);
  });

  it('signs participants up for training and records attendance', async () => {
    const from = startOfWeek(todayIso());
    const { bookings } = await textileApi.bookings(token, from, addDays(from, 6));
    const training = bookings.find((booking) => booking.kind === 'TRAINING');
    const signedUp = await textileApi.addAttendee(token, training.id, 'Grace Akello');
    const attendee = signedUp.attendees.at(-1);
    const marked = await textileApi.setAttendance(token, training.id, attendee.id, true);
    expect(marked.attendees.find((candidate) => candidate.id === attendee.id).attended).toBe(true);
  });
});
