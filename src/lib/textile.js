/**
 * Textile operations — pure domain rules shared by the Textile screens and
 * the MSW mock backend. Keeping them here (instead of inside components)
 * means the acceptance criteria are enforced identically in the UI and the
 * mock API, and are unit-tested in one place (textile.test.js):
 *
 *   - Orders move to Scheduled only after payment is confirmed.
 *   - Stock quantity can never be pushed below zero.
 *   - A machine that is not Working cannot be booked.
 *   - Workshop bookings must not clash with other bookings or the class timetable.
 *
 * The backend stays authoritative; these checks give immediate feedback.
 */

export const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  NEW: 'NEW',
  AWAITING_DETAILS: 'AWAITING_DETAILS',
  RETURNED: 'RETURNED',
  QUOTED: 'QUOTED',
  SCHEDULED: 'SCHEDULED',
  BEING_MADE: 'BEING_MADE',
  READY: 'READY',
  COLLECTED: 'COLLECTED',
};

export const ORDER_STATUS_LABELS = {
  DRAFT: 'Draft',
  NEW: 'New',
  AWAITING_DETAILS: 'Waiting for customer',
  RETURNED: 'Sent back',
  QUOTED: 'Quote sent',
  SCHEDULED: 'Scheduled',
  BEING_MADE: 'Being made',
  READY: 'Ready',
  COLLECTED: 'Collected',
};

export const PAYMENT_STATUS = {
  NOT_REQUESTED: 'NOT_REQUESTED',
  AWAITING_PROOF: 'AWAITING_PROOF',
  PROOF_SUBMITTED: 'PROOF_SUBMITTED',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
};

export const PAYMENT_STATUS_LABELS = {
  NOT_REQUESTED: 'No quote sent',
  AWAITING_PROOF: 'Waiting for proof',
  PROOF_SUBMITTED: 'Finance verifying',
  CONFIRMED: 'Payment confirmed',
  REJECTED: 'Payment rejected',
};

/** The five columns of the order board, in order, and which statuses each holds. */
export const BOARD_COLUMNS = [
  { id: 'new', label: 'New', statuses: ['NEW', 'AWAITING_DETAILS', 'QUOTED'] },
  { id: 'scheduled', label: 'Scheduled', statuses: ['SCHEDULED'] },
  { id: 'being_made', label: 'Being made', statuses: ['BEING_MADE'] },
  { id: 'ready', label: 'Ready', statuses: ['READY'] },
  { id: 'collected', label: 'Collected', statuses: ['COLLECTED'] },
];

/** Orders the domain owner still has to review, quote or chase before scheduling. */
export const REVIEW_STATUSES = ['NEW', 'AWAITING_DETAILS', 'QUOTED'];

export const CUSTOMER_TYPES = ['Public', 'Student', 'Staff', 'Company', 'Internal'];

export const SCHEDULE_BLOCKED_REASON = 'An order can only be scheduled once Finance confirms payment.';
export const READY_BLOCKED_REASON = 'Complete every quality check before marking the order ready.';

export function groupOrdersByColumn(orders) {
  return BOARD_COLUMNS.map((column) => ({
    ...column,
    orders: orders.filter((order) => column.statuses.includes(order.status)),
  }));
}

export function canScheduleOrder(order) {
  return order.status === ORDER_STATUS.QUOTED && order.payment?.status === PAYMENT_STATUS.CONFIRMED;
}

export function isChecklistComplete(checklist) {
  return Array.isArray(checklist) && checklist.length > 0 && checklist.every((item) => item.checked);
}

/**
 * The single next production step available from an order's current status,
 * or null when the order is not in production. Schedule is listed but can be
 * blocked — callers must check `blockedReason`.
 */
export function nextOrderStep(order) {
  switch (order.status) {
    case ORDER_STATUS.QUOTED:
      return {
        toStatus: ORDER_STATUS.SCHEDULED,
        label: 'Move to Scheduled',
        blockedReason: canScheduleOrder(order) ? null : SCHEDULE_BLOCKED_REASON,
      };
    case ORDER_STATUS.SCHEDULED:
      return { toStatus: ORDER_STATUS.BEING_MADE, label: 'Start making', blockedReason: null };
    case ORDER_STATUS.BEING_MADE:
      return {
        toStatus: ORDER_STATUS.READY,
        label: 'Mark ready',
        blockedReason: isChecklistComplete(order.qualityChecklist) ? null : READY_BLOCKED_REASON,
      };
    default:
      return null;
  }
}

/** Throws-free guard used by the mock backend for every status transition. */
export function transitionError(order, toStatus) {
  const step = nextOrderStep(order);
  if (!step || step.toStatus !== toStatus) {
    return `An order that is ${ORDER_STATUS_LABELS[order.status] ?? order.status} cannot move to ${ORDER_STATUS_LABELS[toStatus] ?? toStatus}.`;
  }
  return step.blockedReason;
}

/* ---------------------------------------------------------------- Stock */

export const MOVEMENT_TYPES = {
  RECEIVED: 'RECEIVED',
  USED_ON_ORDER: 'USED_ON_ORDER',
  CORRECTION: 'CORRECTION',
};

export const MOVEMENT_TYPE_LABELS = {
  RECEIVED: 'Received',
  USED_ON_ORDER: 'Used on order',
  CORRECTION: 'Correction',
};

export function isLowStock(item) {
  return item.quantity < item.minimum;
}

/**
 * Signed change a movement makes to stock. Received adds, Used on order
 * subtracts, and a Correction carries its own sign (e.g. -2 after a recount).
 */
export function movementDelta(type, quantity) {
  if (type === MOVEMENT_TYPES.RECEIVED) return Math.abs(quantity);
  if (type === MOVEMENT_TYPES.USED_ON_ORDER) return -Math.abs(quantity);
  return quantity;
}

function roundQuantity(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Validates a stock movement against the current item and returns the
 * resulting balance, or an error message. Quantity can never go below zero.
 */
export function evaluateMovement(item, { type, quantity, note, orderId }) {
  if (!item) return { error: 'Choose an item.' };
  if (!Number.isFinite(quantity) || quantity === 0) return { error: 'Enter a quantity other than zero.' };
  if (type !== MOVEMENT_TYPES.CORRECTION && quantity < 0) return { error: 'Enter a positive quantity.' };
  if (type === MOVEMENT_TYPES.CORRECTION && !note?.trim()) return { error: 'A note is required for a correction.' };
  if (type === MOVEMENT_TYPES.USED_ON_ORDER && !orderId) return { error: 'Choose the order this stock was used on.' };
  const balance = roundQuantity(item.quantity + movementDelta(type, quantity));
  if (balance < 0) {
    return { error: `Only ${item.quantity} ${item.unit} of ${item.name} in stock — quantity can never go below zero.` };
  }
  return { error: null, balance };
}

/**
 * Checks each estimated material against stock. A line is `sufficient` when
 * stock covers it, and `lowAfter` when using it would leave the item below its
 * configured minimum (so a reorder should be flagged).
 */
export function assessMaterials(materials, stockItems) {
  return materials.map((line) => {
    const item = stockItems.find((candidate) => candidate.id === line.itemId) ?? null;
    const available = item?.quantity ?? 0;
    const sufficient = Boolean(item) && line.quantity > 0 && line.quantity <= available;
    const remaining = roundQuantity(available - line.quantity);
    const lowAfter = Boolean(item) && sufficient && remaining < item.minimum;
    return { ...line, item, available, sufficient, remaining, lowAfter };
  });
}

export function describeMaterialLine(line) {
  if (!line.item) return 'Item not found in stock list';
  if (!line.sufficient) return `not enough — only ${line.available} in stock`;
  if (line.lowAfter) return `available, low stock after use — reorder flagged`;
  return `available (${line.available} in stock)`;
}

/* ------------------------------------------------------------- Machines */

export const MACHINE_STATE = {
  WORKING: 'WORKING',
  FAULT_REPORTED: 'FAULT_REPORTED',
  SERVICE_DUE: 'SERVICE_DUE',
  BEING_REPAIRED: 'BEING_REPAIRED',
};

export const MACHINE_STATE_LABELS = {
  WORKING: 'Working',
  FAULT_REPORTED: 'Fault reported',
  SERVICE_DUE: 'Service due',
  BEING_REPAIRED: 'Being repaired',
};

export const MACHINE_UNAVAILABLE_REASON = 'This machine cannot be booked until it is marked Working again.';

export function isMachineBookable(machine) {
  return machine?.state === MACHINE_STATE.WORKING;
}

/* ------------------------------------------------------------- Bookings */

export function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

/** ISO weekday for a YYYY-MM-DD date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

/**
 * Returns every clash a proposed booking has with existing bookings (same
 * date, overlapping time), the weekly class timetable (same weekday,
 * overlapping time), or an unavailable machine. Empty array = no clash.
 */
export function findBookingClashes(proposal, { bookings = [], timetable = [], machines = [] } = {}) {
  const clashes = [];
  if (!proposal.date || !proposal.start || !proposal.end) return clashes;
  if (timeToMinutes(proposal.end) <= timeToMinutes(proposal.start)) {
    return [{ kind: 'time', message: 'The end time must be after the start time.' }];
  }
  for (const booking of bookings) {
    if (booking.id === proposal.id || booking.status === 'CANCELLED') continue;
    if (booking.date === proposal.date && overlaps(proposal.start, proposal.end, booking.start, booking.end)) {
      clashes.push({ kind: 'booking', message: `Clashes with "${booking.purpose}" (${booking.start}–${booking.end}).` });
    }
  }
  const weekday = isoWeekday(proposal.date);
  for (const entry of timetable) {
    if (entry.weekday === weekday && overlaps(proposal.start, proposal.end, entry.start, entry.end)) {
      clashes.push({ kind: 'timetable', message: `Clashes with the class timetable: ${entry.label} (${entry.start}–${entry.end}).` });
    }
  }
  if (proposal.machineId) {
    const machine = machines.find((candidate) => candidate.id === proposal.machineId);
    if (!isMachineBookable(machine)) {
      clashes.push({ kind: 'machine', message: `${machine?.name ?? 'That machine'}: ${MACHINE_UNAVAILABLE_REASON}` });
    }
  }
  return clashes;
}

/* ----------------------------------------------------------- Formatting */

export function formatUgx(amount) {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Monday of the week containing the given ISO date. */
export function startOfWeek(isoDate) {
  return addDays(isoDate, 1 - isoWeekday(isoDate));
}
