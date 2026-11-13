// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  BOARD_COLUMNS, SCHEDULE_BLOCKED_REASON, READY_BLOCKED_REASON, addDays, assessMaterials, canScheduleOrder, describeMaterialLine,
  evaluateMovement, findBookingClashes, groupOrdersByColumn, isLowStock, isMachineBookable, isoWeekday,
  nextOrderStep, startOfWeek, transitionError,
} from './textile';
import { isTextileDomainOwner } from './permissions';

const quoted = (paymentStatus) => ({
  status: 'QUOTED',
  payment: { status: paymentStatus },
  qualityChecklist: [{ id: 'a', checked: false }],
});

describe('orders reach Scheduled only after payment confirms', () => {
  it.each(['NOT_REQUESTED', 'AWAITING_PROOF', 'PROOF_SUBMITTED', 'REJECTED'])('blocks scheduling while payment is %s', (status) => {
    const order = quoted(status);
    expect(canScheduleOrder(order)).toBe(false);
    expect(nextOrderStep(order).blockedReason).toBe(SCHEDULE_BLOCKED_REASON);
    expect(transitionError(order, 'SCHEDULED')).toBe(SCHEDULE_BLOCKED_REASON);
  });

  it('allows scheduling once Finance confirms payment', () => {
    const order = quoted('CONFIRMED');
    expect(canScheduleOrder(order)).toBe(true);
    expect(transitionError(order, 'SCHEDULED')).toBeNull();
  });

  it('never schedules an order that was not quoted, even if paid', () => {
    const order = { ...quoted('CONFIRMED'), status: 'NEW' };
    expect(canScheduleOrder(order)).toBe(false);
    expect(transitionError(order, 'SCHEDULED')).toMatch(/cannot move/);
  });

  it('rejects skipping a production stage', () => {
    expect(transitionError({ status: 'SCHEDULED', payment: { status: 'CONFIRMED' } }, 'READY')).toMatch(/cannot move/);
  });

  it('only marks an order ready when the quality checklist is complete', () => {
    const making = { status: 'BEING_MADE', qualityChecklist: [{ id: 'a', checked: true }, { id: 'b', checked: false }] };
    expect(nextOrderStep(making).blockedReason).toBe(READY_BLOCKED_REASON);
    making.qualityChecklist[1].checked = true;
    expect(nextOrderStep(making).blockedReason).toBeNull();
  });
});

describe('order board', () => {
  it('has the five columns in order', () => {
    expect(BOARD_COLUMNS.map((column) => column.label)).toEqual(['New', 'Scheduled', 'Being made', 'Ready', 'Collected']);
  });

  it('puts quoted and waiting orders in New and leaves drafts and sent-back orders off the board', () => {
    const columns = groupOrdersByColumn([
      { id: '1', status: 'NEW' }, { id: '2', status: 'QUOTED' }, { id: '3', status: 'AWAITING_DETAILS' },
      { id: '4', status: 'DRAFT' }, { id: '5', status: 'RETURNED' }, { id: '6', status: 'COLLECTED' },
    ]);
    expect(columns[0].orders.map((order) => order.id)).toEqual(['1', '2', '3']);
    expect(columns[4].orders.map((order) => order.id)).toEqual(['6']);
    expect(columns.flatMap((column) => column.orders).map((order) => order.id)).not.toContain('4');
  });
});

describe('stock can never go below zero', () => {
  const thread = { id: 't', name: 'Polyester thread', unit: 'spools', quantity: 14, minimum: 20 };

  it('adds received stock', () => {
    expect(evaluateMovement(thread, { type: 'RECEIVED', quantity: 30 })).toEqual({ error: null, balance: 44 });
  });

  it('subtracts stock used on an order, down to exactly zero', () => {
    expect(evaluateMovement(thread, { type: 'USED_ON_ORDER', quantity: 14, orderId: 'TXO-1' })).toEqual({ error: null, balance: 0 });
  });

  it('refuses to use more than is in stock', () => {
    expect(evaluateMovement(thread, { type: 'USED_ON_ORDER', quantity: 15, orderId: 'TXO-1' }).error).toMatch(/below zero/);
  });

  it('refuses a negative correction that would go below zero', () => {
    expect(evaluateMovement(thread, { type: 'CORRECTION', quantity: -20, note: 'recount' }).error).toMatch(/below zero/);
    expect(evaluateMovement(thread, { type: 'CORRECTION', quantity: -4, note: 'recount' })).toEqual({ error: null, balance: 10 });
  });

  it('requires a note for a correction and an order for stock used', () => {
    expect(evaluateMovement(thread, { type: 'CORRECTION', quantity: 2, note: '  ' }).error).toMatch(/note is required/);
    expect(evaluateMovement(thread, { type: 'USED_ON_ORDER', quantity: 1 }).error).toMatch(/order/);
  });

  it('rejects zero and negative received quantities', () => {
    expect(evaluateMovement(thread, { type: 'RECEIVED', quantity: 0 }).error).toBeTruthy();
    expect(evaluateMovement(thread, { type: 'RECEIVED', quantity: -3 }).error).toBeTruthy();
  });

  it('flags items below their configured minimum', () => {
    expect(isLowStock(thread)).toBe(true);
    expect(isLowStock({ ...thread, quantity: 20 })).toBe(false);
  });
});

describe('estimated materials against stock', () => {
  const stock = [
    { id: 'cotton', name: 'Cotton', quantity: 86, minimum: 30 },
    { id: 'thread', name: 'Thread', quantity: 14, minimum: 20 },
  ];

  it('marks lines as available, low after use, or short', () => {
    const [cotton, thread] = assessMaterials([{ itemId: 'cotton', quantity: 9 }, { itemId: 'thread', quantity: 1 }], stock);
    expect(cotton).toMatchObject({ sufficient: true, lowAfter: false, remaining: 77 });
    expect(thread).toMatchObject({ sufficient: true, lowAfter: true });
    const [short] = assessMaterials([{ itemId: 'cotton', quantity: 100 }], stock);
    expect(short).toMatchObject({ sufficient: false });
  });

  it('adds up repeated lines for the same item before checking stock', () => {
    // 50 + 50 = 100 m of cotton, but only 86 m exist: both lines must be short.
    const lines = assessMaterials([{ itemId: 'cotton', quantity: 50 }, { itemId: 'cotton', quantity: 50 }], stock);
    expect(lines.map((line) => line.sufficient)).toEqual([false, false]);
    expect(lines[0]).toMatchObject({ requested: 100, remaining: -14 });
    expect(describeMaterialLine(lines[0])).toBe('not enough — only 86 in stock for 100 across these lines');
  });
});

describe('machines and bookings', () => {
  const machines = [
    { id: 'm1', name: 'Sewing #1', state: 'WORKING' },
    { id: 'm2', name: 'Overlock', state: 'FAULT_REPORTED' },
    { id: 'm3', name: 'Embroidery', state: 'BEING_REPAIRED' },
  ];
  const monday = '2026-11-09';
  const timetable = [{ id: 'tt', weekday: 1, start: '09:00', end: '12:00', label: 'Pattern Cutting I' }];
  const bookings = [{ id: 'b1', date: '2026-11-10', start: '13:00', end: '16:00', purpose: 'Tote bags', status: 'APPROVED' }];

  it('only a Working machine is bookable', () => {
    expect(machines.map(isMachineBookable)).toEqual([true, false, false]);
  });

  it('blocks a booking on a machine that is not Working', () => {
    const clashes = findBookingClashes({ date: '2026-11-11', start: '09:00', end: '10:00', machineId: 'm2' }, { machines });
    expect(clashes).toHaveLength(1);
    expect(clashes[0].kind).toBe('machine');
  });

  it('detects a clash with the class timetable on the same weekday', () => {
    expect(isoWeekday(monday)).toBe(1);
    const clashes = findBookingClashes({ date: monday, start: '11:00', end: '13:00' }, { timetable });
    expect(clashes.map((clash) => clash.kind)).toEqual(['timetable']);
  });

  it('detects a clash with another booking and allows back-to-back slots', () => {
    expect(findBookingClashes({ date: '2026-11-10', start: '15:00', end: '17:00' }, { bookings })[0].kind).toBe('booking');
    expect(findBookingClashes({ date: '2026-11-10', start: '16:00', end: '18:00' }, { bookings })).toEqual([]);
  });

  it('ignores cancelled bookings and rejects an end before the start', () => {
    expect(findBookingClashes({ date: '2026-11-10', start: '13:00', end: '14:00' }, { bookings: [{ ...bookings[0], status: 'CANCELLED' }] })).toEqual([]);
    expect(findBookingClashes({ date: '2026-11-10', start: '14:00', end: '13:00' })[0].kind).toBe('time');
  });

  it('computes week starts across a month boundary', () => {
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });
});

describe('textile permissions', () => {
  it('recognises only the Textile domain owner role', () => {
    expect(isTextileDomainOwner(['ROLE_TEXTILE_DOMAIN_OWNER'])).toBe(true);
    expect(isTextileDomainOwner(['ROLE_REVIEWER'])).toBe(false);
    expect(isTextileDomainOwner(['ROLE_TEXTILE_DOMAIN_OWNER_ASSISTANT'])).toBe(false);
  });
});
