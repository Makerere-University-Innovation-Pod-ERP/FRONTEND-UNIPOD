import { CircleAlert } from 'lucide-react';
import { ApiError } from '@/services/api-client';
import { EQUIPMENT_STATE_LABELS } from '@/lib/equipment';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function ErrorBanner({ error, fallback }) {
  if (!error || (error instanceof ApiError && error.status === 401)) return null;
  const message = error instanceof Error ? error.message : fallback;
  return (
    <div className="api-error api-error-banner" role="alert">
      <CircleAlert size={17} />
      {message || fallback}
    </div>
  );
}

export function Loading({ label, variant = 'list', columns }) {
  return <LoadingSkeleton label={label} variant={variant} columns={columns} />;
}

const EQUIPMENT_TONE = {
  AVAILABLE: 'positive',
  IN_USE: 'attention',
  LOANED: 'progress',
  UNDER_MAINTENANCE: 'danger',
  FAULTY: 'danger',
};

export function StatusDot({ tone, children }) {
  return (
    <span className={`tx-status tx-${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export function EquipmentStateBadge({ state }) {
  return <StatusDot tone={EQUIPMENT_TONE[state] ?? 'neutral'}>{EQUIPMENT_STATE_LABELS[state] ?? state}</StatusDot>;
}

const ALLOCATION_TONE = { PENDING: 'attention', OUT: 'progress', RETURNED: 'positive', REJECTED: 'danger', CANCELLED: 'neutral' };
const ALLOCATION_LABELS = { PENDING: 'Pending approval', OUT: 'Out', RETURNED: 'Returned', REJECTED: 'Declined', CANCELLED: 'Cancelled' };

export function AllocationStatusBadge({ status, overdue }) {
  if (overdue) return <StatusDot tone="danger">Overdue</StatusDot>;
  return <StatusDot tone={ALLOCATION_TONE[status] ?? 'neutral'}>{ALLOCATION_LABELS[status] ?? status}</StatusDot>;
}

const CONTRACT_TONE = { DRAFT: 'attention', SIGNED: 'progress', IN_PROGRESS: 'progress', COMPLETED: 'positive', CANCELLED: 'danger' };
const CONTRACT_STATUS_LABELS = { DRAFT: 'Draft', SIGNED: 'Signed', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };

export function ContractStatusBadge({ status }) {
  return <StatusDot tone={CONTRACT_TONE[status] ?? 'neutral'}>{CONTRACT_STATUS_LABELS[status] ?? status}</StatusDot>;
}
