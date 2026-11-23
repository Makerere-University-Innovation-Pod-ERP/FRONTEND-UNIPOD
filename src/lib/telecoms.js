/**
 * Telecoms operations — pure domain rules shared by the Telecoms screens and
 * the MSW mock backend. Keeping them here (instead of inside components)
 * ensures acceptance criteria are enforced identically in the UI and mock API:
 *
 *   - Requests move to Scheduled only after payment is confirmed by Finance (Rule 7).
 *   - Stock quantity can never be pushed below zero.
 *   - Telecoms lab bookings must not clash with other bookings or the class timetable.
 *   - Equipment loans outside the lab require explicit Manager approval (Workflow 6.3).
 *   - Overdue equipment returns are flagged for manager escalation.
 */

export const REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  NEW: 'NEW',
  AWAITING_DETAILS: 'AWAITING_DETAILS',
  RETURNED: 'RETURNED',
  QUOTED: 'QUOTED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
};

export const REQUEST_STATUS_LABELS = {
  DRAFT: 'Draft',
  NEW: 'New',
  AWAITING_DETAILS: 'Waiting for customer',
  RETURNED: 'Sent back',
  QUOTED: 'Quote sent',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
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

/** The 4 columns of the Telecoms Request Board (TL3 in workflow spec). */
export const BOARD_COLUMNS = [
  { id: 'new', label: 'New', statuses: ['NEW', 'AWAITING_DETAILS', 'QUOTED'] },
  { id: 'scheduled', label: 'Scheduled', statuses: ['SCHEDULED'] },
  { id: 'in_progress', label: 'In progress', statuses: ['IN_PROGRESS'] },
  { id: 'done', label: 'Done', statuses: ['DONE'] },
];

/** Requests waiting for technician review, quoting or clarification. */
export const REVIEW_STATUSES = ['NEW', 'AWAITING_DETAILS', 'QUOTED'];

export const CUSTOMER_TYPES = ['Student', 'Public', 'Company', 'Research Group', 'Internal'];

/** Department rules and regulations accepted on every Telecoms request. */
export const TELECOMS_RULES = [
  'Diagnostic and testing work starts only after the quote is accepted and payment is confirmed by Finance.',
  'Telecoms Lab test equipment stays in the Pod unless an external loan is authorized by a Manager.',
  'Work with high-frequency RF equipment and sensitive semiconductors requires ESD wristbands and grounding.',
  'Equipment on loan must be returned on or before the due date in certified working condition.',
];

export const SCHEDULE_BLOCKED_REASON = 'A request can only be scheduled once Finance confirms payment.';
export const DONE_BLOCKED_REASON = 'Record technician notes and work details before marking the request done.';

export function groupRequestsByColumn(requests) {
  return BOARD_COLUMNS.map((column) => ({
    ...column,
    requests: requests.filter((req) => column.statuses.includes(req.status)),
  }));
}

export function canScheduleRequest(request) {
  return request.status === REQUEST_STATUS.QUOTED && request.payment?.status === PAYMENT_STATUS.CONFIRMED;
}

/**
 * Next operational step from a request's status, or null.
 */
export function nextRequestStep(request) {
  switch (request.status) {
    case REQUEST_STATUS.QUOTED:
      return {
        toStatus: REQUEST_STATUS.SCHEDULED,
        label: 'Move to Scheduled',
        blockedReason: canScheduleRequest(request) ? null : SCHEDULE_BLOCKED_REASON,
      };
    case REQUEST_STATUS.SCHEDULED:
      return {
        toStatus: REQUEST_STATUS.IN_PROGRESS,
        label: 'Start Work',
        blockedReason: null,
      };
    case REQUEST_STATUS.IN_PROGRESS:
      return {
        toStatus: REQUEST_STATUS.DONE,
        label: 'Mark Done',
        blockedReason: request.workDetails?.notes?.trim() ? null : DONE_BLOCKED_REASON,
      };
    default:
      return null;
  }
}

export function transitionError(request, toStatus) {
  const step = nextRequestStep(request);
  if (!step || step.toStatus !== toStatus) {
    return `A request that is ${REQUEST_STATUS_LABELS[request.status] ?? request.status} cannot move to ${REQUEST_STATUS_LABELS[toStatus] ?? toStatus}.`;
  }
  return step.blockedReason;
}

/* ------------------------------------------------------------- Stock */

export const MOVEMENT_TYPES = {
  RECEIVED: 'RECEIVED',
  USED_ON_REQUEST: 'USED_ON_REQUEST',
  CORRECTION: 'CORRECTION',
};

export const MOVEMENT_TYPE_LABELS = {
  RECEIVED: 'Received',
  USED_ON_REQUEST: 'Used on request',
  CORRECTION: 'Correction',
};

export function isLowStock(item) {
  return item.quantity < item.minimum;
}

export function movementDelta(type, quantity) {
  if (type === MOVEMENT_TYPES.RECEIVED) return Math.abs(quantity);
  if (type === MOVEMENT_TYPES.USED_ON_REQUEST) return -Math.abs(quantity);
  return quantity;
}

function roundQuantity(value) {
  return Math.round(value * 100) / 100;
}

export function evaluateMovement(item, { type, quantity, note, requestId }) {
  if (!item) return { error: 'Choose an item.' };
  if (!Number.isFinite(quantity) || quantity === 0) return { error: 'Enter a quantity other than zero.' };
  if (type !== MOVEMENT_TYPES.CORRECTION && quantity < 0) return { error: 'Enter a positive quantity.' };
  const balance = roundQuantity(item.quantity + movementDelta(type, quantity));
  if (balance < 0) {
    return { error: `Only ${item.quantity} ${item.unit} of ${item.name} in stock — quantity can never go below zero.` };
  }
  if (type === MOVEMENT_TYPES.CORRECTION && !note?.trim()) return { error: 'A note is required for a correction.' };
  if (type === MOVEMENT_TYPES.USED_ON_REQUEST && !requestId) return { error: 'Choose the request this stock was used on.' };
  return { error: null, balance };
}

export function assessMaterials(parts, stockItems) {
  return parts.map((line) => {
    const item = stockItems.find((candidate) => candidate.id === line.itemId) ?? null;
    const available = item?.quantity ?? 0;
    const sufficient = Boolean(item) && line.quantity > 0 && line.quantity <= available;
    const remaining = roundQuantity(available - line.quantity);
    const lowAfter = Boolean(item) && sufficient && remaining < item.minimum;
    return { ...line, item, available, sufficient, remaining, lowAfter };
  });
}

export function describeMaterialLine(line) {
  if (!line.item) return 'Part not found in stock list';
  if (!line.sufficient) return `not enough — only ${line.available} in stock`;
  if (line.lowAfter) return `available, low stock after use — reorder flagged`;
  return `available (${line.available} in stock)`;
}

/* ------------------------------------------------------------- Equipment & Lending */

export const EQUIPMENT_STATE = {
  AVAILABLE: 'AVAILABLE',
  IN_USE: 'IN_USE',
  LOANED: 'LOANED',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  FAULTY: 'FAULTY',
};

export const EQUIPMENT_STATE_LABELS = {
  AVAILABLE: 'Available',
  IN_USE: 'In Use in Lab',
  LOANED: 'On Loan',
  UNDER_MAINTENANCE: 'Under Maintenance',
  FAULTY: 'Fault Reported',
};

export const LOAN_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
};

export const LOAN_STATUS_LABELS = {
  PENDING_APPROVAL: 'Pending Manager Approval',
  APPROVED: 'Approved (Awaiting Collection)',
  DECLINED: 'Declined by Manager',
  ACTIVE: 'On Loan (Active)',
  RETURNED: 'Returned',
  OVERDUE: 'Overdue',
};

export function isEquipmentAvailable(item) {
  return item?.state === EQUIPMENT_STATE.AVAILABLE && (item.availableQuantity ?? 1) > 0;
}

export function isLoanOverdue(loan) {
  if (loan.status === LOAN_STATUS.RETURNED || loan.status === LOAN_STATUS.DECLINED) return false;
  const today = todayIso();
  return loan.dateBack < today;
}

/* ------------------------------------------------------------- Lab Bookings */

export function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

export function isoWeekday(date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

export function findLabBookingClashes(proposal, { bookings = [], timetable = [] } = {}) {
  const clashes = [];
  if (!proposal.date || !proposal.start || !proposal.end) return clashes;
  if (timeToMinutes(proposal.end) <= timeToMinutes(proposal.start)) {
    return [{ kind: 'time', message: 'The end time must be after the start time.' }];
  }
  for (const booking of bookings) {
    if (booking.id === proposal.id || booking.status === 'CANCELLED') continue;
    if (booking.date === proposal.date && overlaps(proposal.start, proposal.end, booking.start, booking.end)) {
      clashes.push({ kind: 'booking', message: `Clashes with existing booking: "${booking.purpose}" (${booking.start}–${booking.end}).` });
    }
  }
  const weekday = isoWeekday(proposal.date);
  for (const entry of timetable) {
    if (entry.weekday === weekday && overlaps(proposal.start, proposal.end, entry.start, entry.end)) {
      clashes.push({ kind: 'timetable', message: `Clashes with scheduled class: ${entry.label} (${entry.start}–${entry.end}).` });
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

export function todayIso() {
  return toIsoDate(new Date());
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function startOfWeek(isoDate) {
  return addDays(isoDate, 1 - isoWeekday(isoDate));
}
