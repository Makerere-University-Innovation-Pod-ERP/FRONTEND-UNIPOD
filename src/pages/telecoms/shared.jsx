import { CircleAlert, LoaderCircle } from 'lucide-react';
import { ApiError } from '@/services/api-client';
import { errorMessage } from './helpers';
import {
  EQUIPMENT_STATE_LABELS,
  LOAN_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/lib/telecoms';

export function ErrorBanner({ error, fallback }) {
  if (!error || (error instanceof ApiError && error.status === 401)) return null;
  return (
    <div className="api-error api-error-banner" role="alert">
      <CircleAlert size={17} />
      {errorMessage(error, fallback)}
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

export function PageHeading({ eyebrow, title, intro, children }) {
  return (
    <div className="live-page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

const REQUEST_TONE = {
  DRAFT: 'neutral',
  NEW: 'neutral',
  AWAITING_DETAILS: 'attention',
  RETURNED: 'danger',
  QUOTED: 'attention',
  SCHEDULED: 'progress',
  IN_PROGRESS: 'attention',
  DONE: 'positive',
};

const PAYMENT_TONE = {
  NOT_REQUESTED: 'neutral',
  AWAITING_PROOF: 'attention',
  PROOF_SUBMITTED: 'progress',
  CONFIRMED: 'positive',
  REJECTED: 'danger',
};

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
  OVERDUE: 'danger',
};

export function StatusDot({ tone, children }) {
  return (
    <span className={`tx-status tx-${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export function RequestStatus({ status }) {
  return <StatusDot tone={REQUEST_TONE[status] ?? 'neutral'}>{REQUEST_STATUS_LABELS[status] ?? status}</StatusDot>;
}

export function PaymentStatus({ status }) {
  return <StatusDot tone={PAYMENT_TONE[status] ?? 'neutral'}>{PAYMENT_STATUS_LABELS[status] ?? status}</StatusDot>;
}

export function EquipmentStateBadge({ state }) {
  return <StatusDot tone={EQUIPMENT_TONE[state] ?? 'neutral'}>{EQUIPMENT_STATE_LABELS[state] ?? state}</StatusDot>;
}

export function LoanStatusBadge({ status }) {
  return <StatusDot tone={LOAN_TONE[status] ?? 'neutral'}>{LOAN_STATUS_LABELS[status] ?? status}</StatusDot>;
}
