import { CircleAlert, LoaderCircle } from 'lucide-react';
import { ApiError } from '@/services/api-client';
import { EQUIPMENT_STATE_LABELS, LOAN_STATUS_LABELS } from '@/lib/equipment';

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

export function Loading({ label }) {
  return (
    <div className="live-loading">
      <LoaderCircle className="spin" size={22} />
      {label}
    </div>
  );
}

const EQUIPMENT_TONE = {
  AVAILABLE: 'positive',
  IN_USE: 'attention',
  LOANED: 'progress',
  UNDER_MAINTENANCE: 'danger',
  FAULTY: 'danger',
};

const LOAN_TONE = {
  PENDING_APPROVAL: 'attention',
  APPROVED: 'progress',
  DECLINED: 'danger',
  ACTIVE: 'positive',
  RETURNED: 'neutral',
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

export function LoanStatusBadge({ status, overdue }) {
  return <StatusDot tone={overdue ? 'danger' : LOAN_TONE[status] ?? 'neutral'}>{overdue ? 'Overdue' : LOAN_STATUS_LABELS[status] ?? status}</StatusDot>;
}

const CONTRACT_TONE = { DRAFT: 'attention', SIGNED: 'progress', COMPLETED: 'positive' };
const CONTRACT_STATUS_LABELS = { DRAFT: 'Draft', SIGNED: 'Signed', COMPLETED: 'Completed' };

export function ContractStatusBadge({ status }) {
  return <StatusDot tone={CONTRACT_TONE[status] ?? 'neutral'}>{CONTRACT_STATUS_LABELS[status] ?? status}</StatusDot>;
}
