// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  BOARD_COLUMNS,
  canScheduleRequest,
  evaluateMovement,
  findLabBookingClashes,
  groupRequestsByColumn,
  isEquipmentAvailable,
  isLoanOverdue,
  MOVEMENT_TYPES,
  nextRequestStep,
  SCHEDULE_BLOCKED_REASON,
  transitionError,
} from './telecoms';
import { isTelecomsDomainOwner } from './permissions';

const quotedRequest = (paymentStatus) => ({
  status: 'QUOTED',
  payment: { status: paymentStatus },
  workDetails: { notes: '' },
});

describe('telecoms permissions', () => {
  it('correctly identifies Telecoms domain owner', () => {
    expect(isTelecomsDomainOwner(['ROLE_TELECOMS_DOMAIN_OWNER'])).toBe(true);
    expect(isTelecomsDomainOwner(['ROLE_TEXTILE_DOMAIN_OWNER'])).toBe(false);
    expect(isTelecomsDomainOwner(['ROLE_SUBMITTER'])).toBe(false);
  });
});

describe('requests reach Scheduled only after payment confirms (Rule 7)', () => {
  it.each(['NOT_REQUESTED', 'AWAITING_PROOF', 'PROOF_SUBMITTED', 'REJECTED'])(
    'blocks scheduling while payment is %s',
    (status) => {
      const req = quotedRequest(status);
      expect(canScheduleRequest(req)).toBe(false);
      expect(nextRequestStep(req).blockedReason).toBe(SCHEDULE_BLOCKED_REASON);
      expect(transitionError(req, 'SCHEDULED')).toBe(SCHEDULE_BLOCKED_REASON);
    },
  );

  it('allows scheduling once Finance confirms payment', () => {
    const req = quotedRequest('CONFIRMED');
    expect(canScheduleRequest(req)).toBe(true);
    expect(transitionError(req, 'SCHEDULED')).toBeNull();
  });

  it('never schedules a request that was not quoted, even if paid', () => {
    const req = { ...quotedRequest('CONFIRMED'), status: 'NEW' };
    expect(canScheduleRequest(req)).toBe(false);
    expect(transitionError(req, 'SCHEDULED')).toMatch(/cannot move/);
  });
});

describe('telecoms request board', () => {
  it('has the 4 columns in order (New, Scheduled, In progress, Done)', () => {
    expect(BOARD_COLUMNS.map((col) => col.label)).toEqual(['New', 'Scheduled', 'In progress', 'Done']);
  });

  it('groups requests by column status', () => {
    const columns = groupRequestsByColumn([
      { id: '1', status: 'NEW' },
      { id: '2', status: 'QUOTED' },
      { id: '3', status: 'SCHEDULED' },
      { id: '4', status: 'IN_PROGRESS' },
      { id: '5', status: 'DONE' },
    ]);
    expect(columns[0].requests.map((r) => r.id)).toEqual(['1', '2']);
    expect(columns[1].requests.map((r) => r.id)).toEqual(['3']);
    expect(columns[2].requests.map((r) => r.id)).toEqual(['4']);
    expect(columns[3].requests.map((r) => r.id)).toEqual(['5']);
  });
});

describe('stock can never go below zero', () => {
  const sma = { id: 's', name: 'SMA Connector', unit: 'pcs', quantity: 10, minimum: 5 };

  it('adds received stock', () => {
    expect(evaluateMovement(sma, { type: MOVEMENT_TYPES.RECEIVED, quantity: 15 })).toEqual({
      error: null,
      balance: 25,
    });
  });

  it('subtracts used stock on a request', () => {
    expect(
      evaluateMovement(sma, { type: MOVEMENT_TYPES.USED_ON_REQUEST, quantity: 4, requestId: 'TL-2026-001' }),
    ).toEqual({
      error: null,
      balance: 6,
    });
  });

  it('rejects movements that would push stock below zero', () => {
    const res = evaluateMovement(sma, { type: MOVEMENT_TYPES.USED_ON_REQUEST, quantity: 12, requestId: 'TL-001' });
    expect(res.error).toMatch(/can never go below zero/);
  });

  it('requires a note for inventory correction', () => {
    expect(evaluateMovement(sma, { type: MOVEMENT_TYPES.CORRECTION, quantity: -2, note: '' }).error).toMatch(
      /note is required/,
    );
  });
});

describe('equipment and lending rules', () => {
  it('identifies available equipment correctly', () => {
    expect(isEquipmentAvailable({ state: 'AVAILABLE', availableQuantity: 3 })).toBe(true);
    expect(isEquipmentAvailable({ state: 'FAULTY', availableQuantity: 0 })).toBe(false);
    expect(isEquipmentAvailable({ state: 'AVAILABLE', availableQuantity: 0 })).toBe(false);
  });

  it('detects overdue equipment loans', () => {
    const overdueLoan = { status: 'ACTIVE', dateBack: '2026-10-01' };
    const onTimeLoan = { status: 'ACTIVE', dateBack: '2026-12-31' };
    const returnedLoan = { status: 'RETURNED', dateBack: '2026-10-01' };

    expect(isLoanOverdue(overdueLoan)).toBe(true);
    expect(isLoanOverdue(onTimeLoan)).toBe(false);
    expect(isLoanOverdue(returnedLoan)).toBe(false);
  });
});

describe('lab booking clash detection', () => {
  const timetable = [
    { id: 'tt1', weekday: 2, start: '09:00', end: '11:00', label: 'ELE 4201 Telecom Transmission Systems' },
  ];
  const bookings = [
    { id: 'b1', date: '2026-11-20', start: '14:00', end: '16:00', purpose: 'IoT Sensor Calibration' },
  ];

  it('detects clash with existing booking on same date and overlapping time', () => {
    const clashes = findLabBookingClashes(
      { date: '2026-11-20', start: '15:00', end: '17:00' },
      { bookings, timetable },
    );
    expect(clashes.some((c) => c.kind === 'booking')).toBe(true);
  });

  it('allows non-overlapping booking on same date', () => {
    const clashes = findLabBookingClashes(
      { date: '2026-11-20', start: '16:30', end: '18:00' },
      { bookings, timetable },
    );
    expect(clashes).toHaveLength(0);
  });

  it('detects clash with scheduled class timetable', () => {
    // 2026-11-17 is a Tuesday (isoWeekday = 2)
    const clashes = findLabBookingClashes(
      { date: '2026-11-17', start: '09:30', end: '10:30' },
      { bookings, timetable },
    );
    expect(clashes.some((c) => c.kind === 'timetable')).toBe(true);
  });
});
