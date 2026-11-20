import { StatusDot } from '../multimedia/shared';

export { ErrorBanner, Loading, StatusDot } from '../multimedia/shared';

export const STAGE_LABELS = {
  NEW: 'New',
  QUOTED: 'Quoted',
  PAYMENT_GATE: 'Awaiting payment',
  SCHEDULED: 'Scheduled',
  IN_PRODUCTION: 'Being made',
  READY: 'Ready',
  COLLECTED: 'Collected',
};

const STAGE_TONE = {
  NEW: 'neutral', QUOTED: 'attention', PAYMENT_GATE: 'attention', SCHEDULED: 'progress',
  IN_PRODUCTION: 'progress', READY: 'positive', COLLECTED: 'positive',
};

const PAYMENT_LABELS = {
  WAITING_FOR_PROOF: 'Waiting for proof',
  WAITING_FOR_CHECK: 'Waiting for check',
  PAID: 'Paid',
  RECEIPTED: 'Receipted',
};

export function StageBadge({ stage }) {
  return <StatusDot tone={STAGE_TONE[stage] ?? 'neutral'}>{STAGE_LABELS[stage] ?? stage}</StatusDot>;
}

export function PaymentBadge({ status }) {
  if (!status) return <StatusDot tone="neutral">No invoice yet</StatusDot>;
  const paid = status === 'PAID' || status === 'RECEIPTED';
  return <StatusDot tone={paid ? 'positive' : 'attention'}>{PAYMENT_LABELS[status] ?? status}</StatusDot>;
}

export function PageHeading({ title, intro, children }) {
  return (
    <div className="live-page-heading">
      <div>
        <p className="eyebrow">OPERATIONS · CNC & CARPENTRY</p>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatUgx(amount) {
  return `UGX ${Number(amount ?? 0).toLocaleString('en-US')}`;
}
