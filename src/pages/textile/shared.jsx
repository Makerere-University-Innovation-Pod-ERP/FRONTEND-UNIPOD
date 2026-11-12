import { useId, useRef, useState } from 'react';
import { CircleAlert, ImageUp, LoaderCircle, X } from 'lucide-react';
import { ApiError } from '@/services/api-client';
import { errorMessage, PHOTO_ACCEPT, validatePhoto } from './helpers';
import { MACHINE_STATE_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/textile';

/** Error banner that stays quiet for 401s (the session redirect handles those). */
export function ErrorBanner({ error, fallback }) {
  if (!error || (error instanceof ApiError && error.status === 401)) return null;
  return <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{errorMessage(error, fallback)}</div>;
}

export function Loading({ label }) {
  return <div className="live-loading"><LoaderCircle className="spin" size={22} />{label}</div>;
}

export function PageHeading({ eyebrow, title, intro, children }) {
  return (
    <div className="live-page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{intro && <p>{intro}</p>}</div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

const ORDER_TONE = {
  DRAFT: 'neutral', NEW: 'neutral', AWAITING_DETAILS: 'attention', RETURNED: 'danger', QUOTED: 'attention',
  SCHEDULED: 'progress', BEING_MADE: 'attention', READY: 'positive', COLLECTED: 'positive',
};
const PAYMENT_TONE = { NOT_REQUESTED: 'neutral', AWAITING_PROOF: 'attention', PROOF_SUBMITTED: 'progress', CONFIRMED: 'positive', REJECTED: 'danger' };
const MACHINE_TONE = { WORKING: 'positive', FAULT_REPORTED: 'danger', SERVICE_DUE: 'attention', BEING_REPAIRED: 'danger' };

export function StatusDot({ tone, children }) {
  return <span className={`tx-status tx-${tone}`}><i aria-hidden="true" />{children}</span>;
}

export function OrderStatus({ status }) {
  return <StatusDot tone={ORDER_TONE[status] ?? 'neutral'}>{ORDER_STATUS_LABELS[status] ?? status}</StatusDot>;
}

export function PaymentStatus({ status }) {
  return <StatusDot tone={PAYMENT_TONE[status] ?? 'neutral'}>{PAYMENT_STATUS_LABELS[status] ?? status}</StatusDot>;
}

export function MachineState({ state }) {
  return <StatusDot tone={MACHINE_TONE[state] ?? 'neutral'}>{MACHINE_STATE_LABELS[state] ?? state}</StatusDot>;
}

/**
 * Drop zone / file picker for an optional reference photo. `existingName`
 * shows a photo already stored on the server (e.g. when resuming a draft).
 */
export function PhotoDrop({ label, hint, file, existingName, onChange }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const accept = (candidate) => {
    const problem = validatePhoto(candidate);
    setError(problem);
    onChange(problem ? null : candidate);
    if (problem && inputRef.current) inputRef.current.value = '';
  };

  const name = file?.name ?? existingName;
  return (
    <div className="tx-field">
      <span className="tx-label">{label}</span>
      <label
        htmlFor={inputId}
        className={`tx-drop ${dragging ? 'dragging' : ''} ${name ? 'has-file' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <ImageUp size={18} aria-hidden="true" />
        <b>{name ? `${name} ${file ? 'selected' : 'uploaded'}` : 'Drop a photo or click to choose'}</b>
        <small>{hint}</small>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={PHOTO_ACCEPT}
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button type="button" className="tx-link-button" onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}>
          <X size={12} />Remove photo
        </button>
      )}
      {error && <p className="tx-field-error" role="alert">{error}</p>}
    </div>
  );
}
