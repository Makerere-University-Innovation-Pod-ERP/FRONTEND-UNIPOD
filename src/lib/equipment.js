/**
 * Multimedia equipment register and lending (Assignment 8). Mirrors the
 * Telecoms equipment/lending domain rules (src/lib/telecoms.js) for a
 * separate inventory of AV/recording gear.
 */

export const EQUIPMENT_STATE = {
  AVAILABLE: 'AVAILABLE',
  IN_USE: 'IN_USE',
  LOANED: 'LOANED',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  FAULTY: 'FAULTY',
};

export const EQUIPMENT_STATE_LABELS = {
  AVAILABLE: 'Available',
  IN_USE: 'In Use',
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
};

export const LOAN_STATUS_LABELS = {
  PENDING_APPROVAL: 'Pending Manager Approval',
  APPROVED: 'Approved (Awaiting Collection)',
  DECLINED: 'Declined by Manager',
  ACTIVE: 'On Loan (Active)',
  RETURNED: 'Returned',
};

export function isEquipmentAvailable(item) {
  return item?.state === EQUIPMENT_STATE.AVAILABLE && (item.availableQuantity ?? 1) > 0;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isLoanOverdue(loan) {
  if (loan.status === LOAN_STATUS.RETURNED || loan.status === LOAN_STATUS.DECLINED) return false;
  return loan.dateBack < todayIso();
}
