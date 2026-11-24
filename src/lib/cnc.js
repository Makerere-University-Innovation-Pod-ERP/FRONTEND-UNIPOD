import { CNC_STAGES } from '@/services/cnc';

export const CNC_MOVEMENT_TYPES = {
  RECEIVED: 'RECEIVED',
  USED_ON_ORDER: 'USED_ON_ORDER',
  CORRECTION: 'CORRECTION',
};

export const CNC_MOVEMENT_TYPE_LABELS = {
  RECEIVED: 'Received',
  USED_ON_ORDER: 'Used on job',
  CORRECTION: 'Correction',
};

const INACTIVE_JOB_STAGES = ['NEW', 'COLLECTED'];

export function isLowStock(item) {
  return item.quantity < item.minimum;
}

export function movementDelta(type, quantity) {
  if (type === CNC_MOVEMENT_TYPES.RECEIVED) return Math.abs(quantity);
  if (type === CNC_MOVEMENT_TYPES.USED_ON_ORDER) return -Math.abs(quantity);
  return quantity;
}

function roundQuantity(value) {
  return Math.round(value * 100) / 100;
}

export function evaluateCncMovement(item, { type, quantity, note, jobId }) {
  if (!item) return { error: 'Choose an item.' };
  if (!Number.isFinite(quantity) || quantity === 0) return { error: 'Enter a quantity other than zero.' };
  if (type !== CNC_MOVEMENT_TYPES.CORRECTION && quantity < 0) return { error: 'Enter a positive quantity.' };
  if (type === CNC_MOVEMENT_TYPES.USED_ON_ORDER && !jobId?.trim()) return { error: 'Choose the job this stock was used on.' };
  const balance = roundQuantity(item.quantity + movementDelta(type, quantity));
  if (balance < 0) {
    return { error: `Only ${item.quantity} ${item.unit} of ${item.name} in stock — quantity can never go below zero.` };
  }
  if (type === CNC_MOVEMENT_TYPES.CORRECTION && !note?.trim()) return { error: 'A note is required for a correction.' };
  return { error: null, balance };
}

export function isActiveCncJob(job) {
  return CNC_STAGES.includes(job.stage) && !INACTIVE_JOB_STAGES.includes(job.stage);
}

export function activeCncJobs(jobs) {
  return jobs.filter(isActiveCncJob);
}

export function cncJobLabel(job) {
  return `${job.code} · ${job.title}`;
}
