import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Ban,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  LoaderCircle,
  MapPin,
  Receipt,
  Search,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCancelSubmitterBooking,
  useCreateSubmitterBooking,
  useFacilities,
  useSubmitterBooking,
  useSubmitterBookings,
} from '@/hooks/useBookings';
import {
  useSubmitterInvoice,
  useSubmitterInvoices,
  useSubmitterReceipt,
  useUploadSubmitterPaymentProof,
} from '@/hooks/useInvoices';
import {
  invoicesApi,
  MAX_PAYMENT_PROOF_SIZE,
  SUBMITTER_INVOICE_STATUSES,
} from '@/services/invoices';
import { ApiError } from '@/services/api-client';

function SubmitterWorkspacePage({
  variant,
  title,
  description,
  icon: Icon,
  previewLabel,
  previewTitle,
  previewItems,
  recordsTitle,
  recordsDescription,
  recordsContent,
  emptyTitle,
  emptyDescription,
  tipsTitle,
  tips,
}) {
  return (
    <div className={`live-page page-enter submitter-hub submitter-hub--${variant}`}>
      <section className="submitter-hub__hero" aria-labelledby="submitter-hub-title">
        <div className="submitter-hub__hero-copy">
          <p className="submitter-hub__eyebrow">MY WORKSPACE · SUBMITTER</p>
          <h1 id="submitter-hub-title">{title}</h1>
          <p className="submitter-hub__description">{description}</p>
          <div className="submitter-hub__hero-note">
            <CircleCheck size={16} aria-hidden="true" />
            <span>A clear view of activity linked to your account</span>
          </div>
        </div>

        <div className="submitter-hub__preview" aria-label={previewLabel}>
          <div className="submitter-hub__preview-heading">
            <span>{previewLabel}</span>
            <Icon size={18} aria-hidden="true" />
          </div>
          <h2>{previewTitle}</h2>
          <ol>
            {previewItems.map(({ label, detail, icon: StepIcon }) => (
              <li key={label}>
                <span className="submitter-hub__step-icon">
                  <StepIcon size={15} aria-hidden="true" />
                </span>
                <span>
                  <b>{label}</b>
                  <small>{detail}</small>
                </span>
                <ArrowRight size={14} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="submitter-hub__content">
        <section className="submitter-hub__records" aria-labelledby="submitter-records-title">
          <header className="submitter-hub__section-heading">
            <span className="submitter-hub__section-icon"><Icon size={19} aria-hidden="true" /></span>
            <div>
              <h2 id="submitter-records-title">{recordsTitle}</h2>
              <p>{recordsDescription}</p>
            </div>
            <span className="submitter-hub__scope">YOUR ACCOUNT</span>
          </header>
          {recordsContent || (
            <div className="submitter-hub__empty">
              <span className="submitter-hub__empty-icon"><Icon size={23} aria-hidden="true" /></span>
              <h3>{emptyTitle}</h3>
              <p>{emptyDescription}</p>
            </div>
          )}
        </section>

        {tips?.length > 0 && (
          <aside className="submitter-hub__tips" aria-labelledby="submitter-tips-title">
            <div className="submitter-hub__tips-heading">
              <span><Check size={16} aria-hidden="true" /></span>
              <div>
                <p className="submitter-hub__eyebrow">QUICK GUIDE</p>
                <h2 id="submitter-tips-title">{tipsTitle}</h2>
              </div>
            </div>
            <ul>
              {tips.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

export function SubmitterServiceRequestsPage() {
  return (
    <SubmitterWorkspacePage
      variant="requests"
      title="Service requests"
      description="Keep an eye on requests, updates and the next step from one place."
      icon={ClipboardList}
      previewLabel="REQUEST JOURNEY"
      previewTitle="From request to resolution"
      previewItems={[
        { label: 'Submitted', detail: 'Your request is received', icon: ClipboardList },
        { label: 'Under review', detail: 'The service team checks details', icon: Clock3 },
        { label: 'In progress', detail: 'Work moves forward', icon: ArrowRight },
        { label: 'Resolved', detail: 'The request is complete', icon: CircleCheck },
      ]}
      recordsTitle="Your service requests"
      recordsDescription="A private activity list for requests linked to your account."
      emptyTitle="No service requests to show"
      emptyDescription="Service activity linked to your account will appear here."
      tipsTitle="Keep requests moving"
      tips={[
        'Include the details the service team needs to understand your request.',
        'Check this page for status changes and follow-up information.',
        'Keep related documents together with the request they support.',
      ]}
    />
  );
}

const invoiceStatusLabels = {
  WAITING_FOR_PROOF: 'Awaiting payment',
  WAITING_FOR_CHECK: 'Payment under review',
  PAID: 'Payment verified',
  RECEIPTED: 'Receipt issued',
};

const proofMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const proofExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

function invoiceAmount(invoice) {
  return `${invoice.currency} ${invoice.amount.toLocaleString('en-US')}`;
}

function invoiceDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function invoiceSourceLabel(sourceType) {
  return {
    REQUEST: 'Service request',
    BOOKING: 'Facility booking',
    SESSION: 'Session',
    JOB: 'Job',
  }[sourceType] ?? sourceType;
}

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function SubmitterPaymentProofForm({ invoice, onCancel, onSubmit, pending }) {
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(String(invoice.amount));
  const [paidOn, setPaidOn] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState('');

  function submit(event) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const extension = file?.name.split('.').pop()?.toLowerCase();
    const typeAllowed = file && (
      !file.type
      || file.type === 'application/octet-stream'
      || proofMimeTypes.has(file.type)
    );

    if (!reference.trim() || reference.trim().length > 120) {
      setValidationError('Enter a payment reference of 1 to 120 characters.');
    } else if (!Number.isSafeInteger(numericAmount) || numericAmount < 1) {
      setValidationError('Enter a whole-number payment amount greater than zero.');
    } else if (numericAmount !== invoice.amount) {
      setValidationError(`The payment amount must match this invoice: ${invoiceAmount(invoice)}.`);
    } else if (!paidOn) {
      setValidationError('Choose the date the payment was made.');
    } else if (!file || file.size === 0) {
      setValidationError('Choose a non-empty proof file.');
    } else if (file.size > MAX_PAYMENT_PROOF_SIZE) {
      setValidationError('The proof file must be 15 MB or smaller.');
    } else if (!proofExtensions.has(extension) || !typeAllowed) {
      setValidationError('Choose a PDF, JPG, PNG, or WebP proof file.');
    } else {
      setValidationError('');
      void onSubmit({
        reference: reference.trim(),
        amount: numericAmount,
        paidOn,
        file,
      });
    }
  }

  return (
    <form className="submitter-proof-form" onSubmit={submit}>
      <div className="submitter-proof-form__heading">
        <div>
          <p className="submitter-hub__eyebrow">PAYMENT EVIDENCE</p>
          <h4>Upload proof for {invoice.number}</h4>
        </div>
        <span>{invoiceAmount(invoice)} due</span>
      </div>
      <div className="submitter-proof-form__fields">
        <label>
          Payment reference
          <input
            required
            maxLength={120}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Bank or mobile-money reference"
          />
        </label>
        <label>
          Amount paid (UGX)
          <input
            required
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          Date paid
          <input
            required
            type="date"
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
          />
        </label>
        <label className="submitter-proof-form__file">
          Proof document
          <input
            type="file"
            aria-label="Proof document"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <small>{file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : 'PDF or image · up to 15 MB'}</small>
        </label>
      </div>
      {validationError && <p className="submitter-proof-form__error" role="alert">{validationError}</p>}
      <div className="submitter-proof-form__actions">
        <button type="button" className="submitter-invoice-button submitter-invoice-button--quiet" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className="submitter-invoice-button submitter-invoice-button--primary" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}
          {pending ? 'Uploading proof…' : 'Submit payment proof'}
        </button>
      </div>
    </form>
  );
}

function SubmitterInvoiceDetails({ invoiceId, token, onUnauthorized, onDownload }) {
  const invoiceQuery = useSubmitterInvoice(token, invoiceId);
  const invoice = invoiceQuery.data;
  const receiptQuery = useSubmitterReceipt(token, invoiceId, invoice?.status === 'RECEIPTED');

  useEffect(() => {
    if (
      (invoiceQuery.error instanceof ApiError && invoiceQuery.error.status === 401)
      || (receiptQuery.error instanceof ApiError && receiptQuery.error.status === 401)
    ) {
      onUnauthorized?.();
    }
  }, [invoiceQuery.error, onUnauthorized, receiptQuery.error]);

  if (invoiceQuery.isPending) {
    return <div className="submitter-invoice-details__loading" role="status"><LoaderCircle className="spin" size={16} />Loading invoice details…</div>;
  }
  if (invoiceQuery.error || !invoice) {
    return <div className="submitter-invoice-details__error" role="alert">
      {invoiceQuery.error instanceof Error ? invoiceQuery.error.message : 'Invoice details could not be loaded.'}
    </div>;
  }

  const receipt = receiptQuery.data ?? invoice.receipt;
  return (
    <div className="submitter-invoice-details" role="region" aria-label={`Invoice ${invoice.number} details`}>
      <dl>
        <div><dt>Invoice reference</dt><dd>{invoice.number}</dd></div>
        <div><dt>Issued to</dt><dd>{invoice.customerName || invoice.customerEmail}<small>{invoice.customerEmail}</small></dd></div>
        <div><dt>Issued by</dt><dd>{invoice.issuedBy}</dd></div>
        <div><dt>Related to</dt><dd>{invoiceSourceLabel(invoice.sourceType)}{invoice.sourceId ? ` · ${invoice.sourceId}` : ''}</dd></div>
        {invoice.paymentProof && (
          <>
            <div><dt>Payment reference</dt><dd>{invoice.paymentProof.reference}</dd></div>
            <div><dt>Proof submitted</dt><dd>{invoiceDate(invoice.paymentProof.uploadedAt)}</dd></div>
            {invoice.paymentProof.rejectionReason && (
              <div className="submitter-invoice-details__wide"><dt>Finance note</dt><dd>{invoice.paymentProof.rejectionReason}</dd></div>
            )}
          </>
        )}
        {receipt && (
          <>
            <div><dt>Receipt number</dt><dd>{receipt.receiptNumber}</dd></div>
            <div><dt>Receipt issued</dt><dd>{invoiceDate(receipt.issuedAt)}</dd></div>
          </>
        )}
      </dl>
      {receiptQuery.error && (
        <p className="submitter-invoice-details__error" role="alert">
          {receiptQuery.error instanceof Error ? receiptQuery.error.message : 'Receipt details could not be loaded.'}
        </p>
      )}
      <div className="submitter-invoice-details__actions">
        {invoice.paymentProof && (
          <button type="button" className="submitter-invoice-button" onClick={() => onDownload(invoice, 'proof')}>
            <Download size={14} />Download submitted proof
          </button>
        )}
        {receipt && (
          <>
            <button type="button" className="submitter-invoice-button" onClick={() => onDownload(invoice, 'receipt-pdf')}>
              <Download size={14} />Download receipt PDF
            </button>
            <button type="button" className="submitter-invoice-button submitter-invoice-button--quiet" onClick={() => onDownload(invoice, 'receipt-text')}>
              <FileCheck2 size={14} />Printable receipt
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SubmitterInvoiceRecords({ token, onUnauthorized }) {
  const linkedInvoiceId = new URLSearchParams(window.location.search).get('invoice');
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(linkedInvoiceId);
  const [proofInvoiceId, setProofInvoiceId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const query = useSubmitterInvoices(token, { page, size: 25, status: status || undefined });
  const linkedInvoiceQuery = useSubmitterInvoice(token, linkedInvoiceId, Boolean(linkedInvoiceId));
  const uploadMutation = useUploadSubmitterPaymentProof(token);

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) onUnauthorized?.();
  }, [onUnauthorized, query.error]);
  useEffect(() => {
    if (linkedInvoiceQuery.error instanceof ApiError && linkedInvoiceQuery.error.status === 401) onUnauthorized?.();
  }, [linkedInvoiceQuery.error, onUnauthorized]);

  const invoices = query.data?.items ?? [];
  const filteredInvoices = invoices.filter((invoice) => (
    [invoice.number, invoice.description, invoice.statusLabel, invoice.sourceId]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  ));
  const displayedInvoices = [...filteredInvoices];
  if (linkedInvoiceQuery.data && !displayedInvoices.some((invoice) => invoice.id === linkedInvoiceQuery.data.id)) {
    displayedInvoices.unshift(linkedInvoiceQuery.data);
  }

  function showActionError(error) {
    if (error instanceof ApiError && error.status === 401) {
      onUnauthorized?.();
      return;
    }
    setActionError(error instanceof Error ? error.message : 'The invoice action could not be completed.');
  }

  async function download(invoice, type) {
    const key = `${invoice.id}:${type}`;
    const invoiceFileName = invoice.number.replace(/[^a-zA-Z0-9._-]/g, '_');
    const downloads = {
      invoice: [`${invoiceFileName}-invoice.pdf`, () => invoicesApi.downloadMyInvoicePdf(invoice.id, token)],
      proof: [
        invoice.paymentProof?.originalFilename || `${invoiceFileName}-payment-proof`,
        () => invoicesApi.downloadMyPaymentProof(invoice.id, token),
      ],
      'receipt-pdf': [`${invoice.receipt?.receiptNumber || invoiceFileName}-receipt.pdf`, () => invoicesApi.downloadMyReceiptPdf(invoice.id, token)],
      'receipt-text': [`${invoice.receipt?.receiptNumber || invoiceFileName}-receipt.txt`, () => invoicesApi.downloadMyReceipt(invoice.id, token)],
    };
    const [filename, getFile] = downloads[type];
    setActionError('');
    setActionNotice('');
    setBusyAction(key);
    try {
      saveDownload(await getFile(), filename);
    } catch (error) {
      showActionError(error);
    } finally {
      setBusyAction('');
    }
  }

  async function uploadProof(invoice, proof) {
    setActionError('');
    setActionNotice('');
    try {
      await uploadMutation.mutateAsync({ id: invoice.id, proof });
      setProofInvoiceId(null);
      setActionNotice(`Payment proof submitted for ${invoice.number}.`);
    } catch (error) {
      showActionError(error);
    }
  }

  function toggleStatus(nextStatus) {
    setPage(0);
    setStatus(nextStatus);
    setSearch('');
    setExpandedId(null);
    setProofInvoiceId(null);
  }

  return (
    <div className="submitter-invoice-workspace">
      {actionError && <div className="submitter-invoice-alert" role="alert"><CircleAlert size={16} />{actionError}</div>}
      {actionNotice && <div className="submitter-invoice-notice" role="status"><CircleCheck size={16} />{actionNotice}</div>}
      {query.error && (
        <div className="submitter-invoice-alert" role="alert">
          <CircleAlert size={16} />
          <span>{query.error instanceof Error ? query.error.message : 'Invoices could not be loaded.'}</span>
          <button type="button" onClick={() => query.refetch()}>Retry</button>
        </div>
      )}
      {linkedInvoiceQuery.error && (
        <div className="submitter-invoice-alert" role="alert">
          <CircleAlert size={16} />
          <span>{linkedInvoiceQuery.error instanceof Error ? linkedInvoiceQuery.error.message : 'The linked invoice could not be loaded.'}</span>
        </div>
      )}
      <div className="submitter-invoice-controls">
        <label className="submitter-invoice-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search invoices on this page"
            placeholder="Search reference or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && <button type="button" aria-label="Clear invoice search" onClick={() => setSearch('')}><X size={14} /></button>}
        </label>
        <label className="submitter-invoice-filter">
          <span>Payment status</span>
          <select aria-label="Filter invoices by status" value={status} onChange={(event) => toggleStatus(event.target.value)}>
            <option value="">All invoices</option>
            {SUBMITTER_INVOICE_STATUSES.map((invoiceStatus) => (
              <option key={invoiceStatus} value={invoiceStatus}>{invoiceStatusLabels[invoiceStatus]}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="submitter-invoice-count" aria-live="polite">
        {query.data
          ? `${query.data.totalElements} ${query.data.totalElements === 1 ? 'invoice' : 'invoices'}${status ? ` · ${invoiceStatusLabels[status]}` : ''}`
          : 'Your invoice list'}
      </p>
      {query.isPending && <div className="submitter-invoice-state" role="status"><LoaderCircle className="spin" size={20} />Loading your invoices…</div>}
      {query.data && displayedInvoices.length === 0 && (
        <div className="submitter-invoice-state">
          <span className="submitter-invoice-state__icon"><Receipt size={21} /></span>
          <h3>{search ? 'No matching invoices' : status ? 'No invoices in this status' : 'No invoices yet'}</h3>
          <p>{search ? 'Try another reference or description.' : 'Invoices issued to your account will appear here.'}</p>
          {search && <button type="button" className="submitter-invoice-button submitter-invoice-button--quiet" onClick={() => setSearch('')}>Clear search</button>}
        </div>
      )}
      <div className="submitter-invoice-list">
        {displayedInvoices.map((invoice) => {
          const expanded = expandedId === invoice.id;
          const proofOpen = proofInvoiceId === invoice.id;
          const invoicePdfKey = `${invoice.id}:invoice`;
          return (
            <article className="submitter-invoice-card" key={invoice.id}>
              <div className="submitter-invoice-card__main">
                <div className="submitter-invoice-card__identity">
                  <div className="submitter-invoice-card__reference">
                    <span>{invoice.number}</span>
                    <span className={`submitter-invoice-status submitter-invoice-status--${invoice.status.toLowerCase().replaceAll('_', '-')}`}>
                      <span aria-hidden="true" />{invoice.statusLabel || invoiceStatusLabels[invoice.status]}
                    </span>
                  </div>
                  <h3>{invoice.description}</h3>
                  <p>{invoiceSourceLabel(invoice.sourceType)}{invoice.sourceId ? ` · ${invoice.sourceId}` : ''}<span aria-hidden="true"> · </span>Issued {invoiceDate(invoice.createdAt)}</p>
                </div>
                <div className="submitter-invoice-card__amount">
                  <span>AMOUNT DUE</span>
                  <strong>{invoiceAmount(invoice)}</strong>
                </div>
              </div>
              <div className="submitter-invoice-card__actions">
                <button
                  type="button"
                  className="submitter-invoice-button submitter-invoice-button--quiet"
                  aria-expanded={expanded}
                  aria-controls={`invoice-details-${invoice.id}`}
                  onClick={() => {
                    setExpandedId(expanded ? null : invoice.id);
                    setProofInvoiceId(null);
                    setActionError('');
                  }}
                >
                  {expanded ? 'Hide details' : 'Invoice details'}
                </button>
                <button
                  type="button"
                  className="submitter-invoice-button"
                  disabled={busyAction === invoicePdfKey}
                  onClick={() => download(invoice, 'invoice')}
                >
                  {busyAction === invoicePdfKey ? <LoaderCircle className="spin" size={14} /> : <Download size={14} />}
                  {busyAction === invoicePdfKey ? 'Preparing…' : 'Invoice PDF'}
                </button>
                {invoice.status === 'WAITING_FOR_PROOF' && (
                  <button
                    type="button"
                    className="submitter-invoice-button submitter-invoice-button--primary"
                    aria-expanded={proofOpen}
                    onClick={() => {
                      setProofInvoiceId(proofOpen ? null : invoice.id);
                      setExpandedId(null);
                      setActionError('');
                    }}
                  >
                    <Upload size={14} />{proofOpen ? 'Close upload form' : 'Upload payment proof'}
                  </button>
                )}
              </div>
              {expanded && (
                <div id={`invoice-details-${invoice.id}`}>
                  <SubmitterInvoiceDetails
                    invoiceId={invoice.id}
                    token={token}
                    onUnauthorized={onUnauthorized}
                    onDownload={download}
                  />
                </div>
              )}
              {proofOpen && (
                <SubmitterPaymentProofForm
                  invoice={invoice}
                  onCancel={() => setProofInvoiceId(null)}
                  onSubmit={(proof) => uploadProof(invoice, proof)}
                  pending={uploadMutation.isPending}
                />
              )}
            </article>
          );
        })}
      </div>
      {query.data && query.data.totalPages > 1 && (
        <nav className="submitter-invoice-pagination" aria-label="Invoice pages">
          <span>Page {query.data.page + 1} of {query.data.totalPages}</span>
          <div>
            <button
              type="button"
              aria-label="Previous invoice page"
              disabled={page === 0 || query.isFetching}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            ><ChevronLeft size={15} />Previous</button>
            <button
              type="button"
              aria-label="Next invoice page"
              disabled={page + 1 >= query.data.totalPages || query.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >Next<ChevronRight size={15} /></button>
          </div>
        </nav>
      )}
    </div>
  );
}

export function SubmitterInvoicesPage({ token, onUnauthorized }) {
  return (
    <SubmitterWorkspacePage
      variant="payments"
      title="Invoices and payments"
      description="Follow invoices, payment evidence and receipts linked to your account."
      icon={Receipt}
      previewLabel="PAYMENT CHECKLIST"
      previewTitle="A simple payment trail"
      previewItems={[
        { label: 'Invoice issued', detail: 'Review the amount and instructions', icon: FileCheck2 },
        { label: 'Payment made', detail: 'Use the payment details provided', icon: CreditCard },
        { label: 'Proof submitted', detail: 'Share payment evidence for review', icon: Upload },
        { label: 'Receipt available', detail: 'Keep your official receipt', icon: Receipt },
      ]}
      recordsTitle="Your invoices"
      recordsDescription="Live invoice records and payment updates associated with your account."
      recordsContent={<SubmitterInvoiceRecords token={token} onUnauthorized={onUnauthorized} />}
    />
  );
}

function localDateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatBookingDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
}

function formatBookingTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function dateFromInput(value) {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
}

function dateToInput(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function SearchableFacilityPicker({ id, facilities, value, onChange, disabled, loading }) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedFacility = facilities.find((facility) => facility.id === value);
  const filteredFacilities = facilities.filter((facility) => (
    `${facility.name} ${facility.location ?? ''} ${facility.department ?? ''}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  ));
  const selectableFacilities = filteredFacilities.filter((facility) => facility.status !== 'MAINTENANCE');
  const activeFacility = selectableFacilities[activeIndex];
  const listId = 'submitter-booking-facility-options';

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function choose(facility) {
    if (facility.status === 'MAINTENANCE') return;
    onChange(facility.id);
    setSearch('');
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, selectableFacilities.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (activeFacility) choose(activeFacility);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="submitter-booking-facility" ref={containerRef}>
      <div className={`submitter-booking-facility__control${open ? ' is-open' : ''}`}>
        <Search size={15} aria-hidden="true" />
        <input
          id={id}
          role="combobox"
          aria-label="Facility"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && activeFacility ? `${listId}-${activeFacility.id}` : undefined}
          autoComplete="off"
          required
          disabled={disabled}
          value={search || selectedFacility?.name || ''}
          placeholder={loading ? 'Loading facilities…' : 'Type to search or select a facility'}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveIndex(0);
            setOpen(true);
            onChange('');
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown size={15} aria-hidden="true" />
      </div>
      {open && !disabled && (
        <div id={listId} className="submitter-booking-facility__options" role="listbox" aria-label="Facilities">
          {loading ? (
            <p className="submitter-booking-facility__empty">Loading facilities…</p>
          ) : filteredFacilities.length === 0 ? (
            <p className="submitter-booking-facility__empty">No facilities match your search.</p>
          ) : filteredFacilities.map((facility) => {
            const unavailable = facility.status === 'MAINTENANCE';
            return (
              <button
                id={`${listId}-${facility.id}`}
                key={facility.id}
                type="button"
                role="option"
                aria-selected={facility.id === value}
                aria-disabled={unavailable}
                className={`submitter-booking-facility__option${facility.id === value ? ' is-selected' : ''}${unavailable ? ' is-disabled' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(facility)}
              >
                <span>
                  <strong>{facility.name}</strong>
                  <small>{facility.location || facility.department || 'Facility'}</small>
                </span>
                <span className="submitter-booking-facility__badge">
                  {unavailable ? 'Maintenance' : `Up to ${facility.capacity}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingDatePicker({ id, value, min, onChange }) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = dateFromInput(value);
  const firstDate = dateFromInput(min);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="submitter-booking-date-picker" ref={containerRef}>
      <button
        id={id}
        type="button"
        className={`submitter-booking-date-picker__trigger${open ? ' is-open' : ''}`}
        aria-label="Booking date"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? 'submitter-booking-calendar' : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span>{selectedDate ? new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(selectedDate) : 'Choose a date'}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div id="submitter-booking-calendar" className="submitter-booking-calendar" role="dialog" aria-label="Choose booking date">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(dateToInput(date));
              setOpen(false);
            }}
            disabled={firstDate ? { before: firstDate } : undefined}
            startMonth={firstDate}
            className="submitter-booking-day-picker"
          />
        </div>
      )}
    </div>
  );
}

const bookingStatusLabels = {
  PENDING: 'Awaiting review',
  APPROVED: 'Confirmed',
  REJECTED: 'Declined',
  CHECKED_IN: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  OUT: 'In use',
  RETURNED: 'Returned',
};

function SubmitterBookingDetails({ query }) {
  if (query.isPending) {
    return <p className="submitter-booking-details__state"><LoaderCircle className="spin" size={15} />Loading booking details…</p>;
  }
  if (query.error) {
    return <p className="submitter-booking-alert" role="alert">{query.error.message || 'Could not load booking details.'}</p>;
  }
  const booking = query.data;
  return (
    <dl className="submitter-booking-details">
      <div><dt>Facility</dt><dd>{booking.facilityName}{booking.facilityLocation ? ` · ${booking.facilityLocation}` : ''}</dd></div>
      <div><dt>Purpose</dt><dd>{booking.purpose}</dd></div>
      <div><dt>Start</dt><dd>{formatBookingDate(booking.startsAt)} · {formatBookingTime(booking.startsAt)}</dd></div>
      <div><dt>End</dt><dd>{formatBookingDate(booking.endsAt)} · {formatBookingTime(booking.endsAt)}</dd></div>
      <div><dt>Attendees</dt><dd>{booking.attendees}</dd></div>
      {booking.operator && <div><dt>Contact / operator</dt><dd>{booking.operator}</dd></div>}
      {booking.rejectionReason && <div className="submitter-booking-details__wide"><dt>Decision note</dt><dd>{booking.rejectionReason}</dd></div>}
    </dl>
  );
}

function SubmitterBookingRecords({ token, onUnauthorized }) {
  const linkedBookingId = new URLSearchParams(window.location.search).get('booking');
  const [page, setPage] = useState(0);
  const bookingsQuery = useSubmitterBookings(token, { page, size: 25 });
  const facilitiesQuery = useFacilities(token);
  const createBooking = useCreateSubmitterBooking(token);
  const cancelBooking = useCancelSubmitterBooking(token);
  const [form, setForm] = useState(() => ({
    facilityId: '',
    date: localDateAfter(1),
    start: '09:00',
    end: '11:00',
    purpose: '',
    operator: '',
    attendees: '1',
  }));
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  const [detailsId, setDetailsId] = useState(linkedBookingId);
  const [cancelId, setCancelId] = useState(null);
  const facilities = facilitiesQuery.data ?? [];
  const availableFacilities = facilities.filter((facility) => facility.status !== 'MAINTENANCE');
  const facilityId = form.facilityId;
  const facility = facilities.find((item) => item.id === facilityId);
  const start = new Date(`${form.date}T${form.start}:00`);
  const end = new Date(`${form.date}T${form.end}:00`);
  const validStart = Number.isFinite(start.getTime()) && start.getTime() > now;
  const validRange = validStart && Number.isFinite(end.getTime()) && end > start;
  const attendeeCount = Number(form.attendees);
  const validAttendees = Number.isInteger(attendeeCount)
    && attendeeCount >= 1
    && (!facility || attendeeCount <= facility.capacity);
  const canSubmit = Boolean(
    token
    && facility
    && facility.status !== 'MAINTENANCE'
    && validRange
    && validAttendees
    && form.purpose.trim()
    && form.purpose.trim().length <= 1000
    && form.operator.trim().length <= 254,
  );
  const unauthorized = [
    bookingsQuery.error,
    facilitiesQuery.error,
    createBooking.error,
    cancelBooking.error,
  ].some((error) => error instanceof ApiError && error.status === 401);

  useEffect(() => {
    if (unauthorized) onUnauthorized?.();
  }, [unauthorized, onUnauthorized]);

  function updateForm(field) {
    return (event) => {
      setNotice('');
      setNow(Date.now());
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setNotice('');
    createBooking.mutate({
      facilityId,
      purpose: form.purpose.trim(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      attendees: attendeeCount,
      ...(form.operator.trim() ? { operator: form.operator.trim() } : {}),
    }, {
      onSuccess: (booking) => {
        setNotice(`Request ${booking.reference} was submitted and is awaiting review.`);
        toast.success('Booking request submitted', {
          description: `${booking.reference} is awaiting review.`,
        });
        setPage(0);
        setForm((current) => ({
          ...current,
          purpose: '',
          operator: '',
          attendees: '1',
        }));
      },
      onError: (error) => {
        toast.error('Booking request failed', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      },
    });
  }

  function cancel(id) {
    setNotice('');
    cancelBooking.mutate(id, {
      onSuccess: (booking) => {
        setNotice(`Booking ${booking.reference} was cancelled.`);
        toast.success('Booking cancelled', {
          description: `${booking.reference} has been cancelled.`,
        });
        setCancelId(null);
      },
      onError: (error) => {
        toast.error('Could not cancel booking', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      },
    });
  }

  const list = bookingsQuery.data?.items ?? [];
  const detailsQuery = useSubmitterBooking(token, detailsId, Boolean(detailsId));
  const linkedBooking = detailsQuery.data;
  const showLinkedBooking = Boolean(
    linkedBookingId && linkedBooking && !list.some((booking) => booking.id === linkedBooking.id),
  );
  const bookingToCancel = list.find((booking) => booking.id === cancelId);
  const actionError = createBooking.error || cancelBooking.error;
  useEffect(() => {
    if (detailsQuery.error instanceof ApiError && detailsQuery.error.status === 401) onUnauthorized?.();
  }, [detailsQuery.error, onUnauthorized]);

  return (
    <div className="submitter-booking-workspace">
      {(notice || actionError) && (
        <div className={actionError ? 'submitter-booking-alert' : 'submitter-booking-notice'} role={actionError ? 'alert' : 'status'}>
          {actionError ? <CircleAlert size={15} aria-hidden="true" /> : <CircleCheck size={15} aria-hidden="true" />}
          <span>{actionError?.message || notice || 'The booking action could not be completed.'}</span>
          {notice && !actionError && <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={14} /></button>}
        </div>
      )}

      <section className="submitter-booking-panel" aria-labelledby="submitter-booking-form-title">
        <header className="submitter-booking-panel__heading">
          <span><CalendarPlus size={17} aria-hidden="true" /></span>
          <div>
            <p className="submitter-hub__eyebrow">NEW REQUEST</p>
            <h3 id="submitter-booking-form-title">Request a facility booking</h3>
          </div>
        </header>
        {facilitiesQuery.error && (
          <p className="submitter-booking-alert" role="alert">{facilitiesQuery.error.message || 'Facilities could not be loaded.'}</p>
        )}
        {facilitiesQuery.data && availableFacilities.length === 0 && (
          <p className="submitter-booking-alert" role="status">No facilities are currently available to request.</p>
        )}
        <form className="submitter-booking-form" onSubmit={submit}>
          <div className="submitter-booking-form__field">
            <label htmlFor="submitter-booking-facility">Facility</label>
            <SearchableFacilityPicker
              id="submitter-booking-facility"
              facilities={facilities}
              value={facilityId}
              onChange={(value) => {
                setNotice('');
                setForm((current) => ({ ...current, facilityId: value }));
              }}
              disabled={availableFacilities.length === 0}
              loading={facilitiesQuery.isPending}
            />
            {facility?.location && <small><MapPin size={12} aria-hidden="true" />{facility.location}</small>}
          </div>
          <div className="submitter-booking-form__grid">
            <div className="submitter-booking-form__field">
              <label htmlFor="submitter-booking-date">Date</label>
              <BookingDatePicker
                id="submitter-booking-date"
                value={form.date}
                min={localDateAfter(0)}
                onChange={(date) => {
                  setNotice('');
                  setNow(Date.now());
                  setForm((current) => ({ ...current, date }));
                }}
              />
            </div>
            <label>
              Attendees
              <input aria-label="Attendees" type="number" required min="1" max={facility?.capacity} step="1" value={form.attendees} onChange={updateForm('attendees')} />
            </label>
            <label>
              Start time
              <input aria-label="Start time" type="time" required value={form.start} onChange={updateForm('start')} />
            </label>
            <label>
              End time
              <input aria-label="End time" type="time" required value={form.end} onChange={updateForm('end')} />
            </label>
          </div>
          {(!validStart || (validStart && !validRange)) && form.date && form.start && form.end && (
            <p className="submitter-booking-form__hint" role="status">
              {!validStart ? 'Choose a start time in the future.' : 'The end time must be after the start time.'}
            </p>
          )}
          {facility && attendeeCount > facility.capacity && (
            <p className="submitter-booking-form__hint" role="alert">This facility holds up to {facility.capacity} attendees.</p>
          )}
          <div className="submitter-booking-form__field">
            <label htmlFor="submitter-booking-purpose">Purpose</label>
            <div className="submitter-booking-purpose">
              <textarea
                id="submitter-booking-purpose"
                aria-label="Purpose"
                required
                maxLength={1000}
                rows="3"
                value={form.purpose}
                onChange={updateForm('purpose')}
                placeholder="Tell the facility team what you plan to do."
              />
              <span>{form.purpose.length} / 1000</span>
            </div>
            <small className="submitter-booking-form__helper">A short description helps the facility team prepare for your visit.</small>
          </div>
          <label>
            Contact / operator <span>(optional)</span>
            <input aria-label="Contact / operator" maxLength={254} value={form.operator} onChange={updateForm('operator')} placeholder="Name of the person coordinating the visit" />
          </label>
          <button className="submitter-booking-button submitter-booking-button--primary" type="submit" disabled={!canSubmit || createBooking.isPending}>
            {createBooking.isPending ? <LoaderCircle className="spin" size={15} /> : <CalendarPlus size={15} />}
            {createBooking.isPending ? 'Submitting request…' : 'Request booking'}
          </button>
        </form>
      </section>

      <section className="submitter-booking-panel" aria-labelledby="submitter-booking-list-title">
        <header className="submitter-booking-panel__heading">
          <span><CalendarDays size={17} aria-hidden="true" /></span>
          <div>
            <p className="submitter-hub__eyebrow">YOUR ACTIVITY</p>
            <h3 id="submitter-booking-list-title">Your booking requests</h3>
          </div>
          {bookingsQuery.data && <span className="submitter-booking-count">{bookingsQuery.data.totalElements}</span>}
        </header>
        {bookingsQuery.error && (
          <div className="submitter-booking-alert" role="alert">
            <CircleAlert size={15} aria-hidden="true" />
            <span>{bookingsQuery.error.message || 'Your bookings could not be loaded.'}</span>
            <button type="button" onClick={() => bookingsQuery.refetch()}>Retry</button>
          </div>
        )}
        {bookingsQuery.isPending ? (
          <div className="submitter-booking-state"><LoaderCircle className="spin" size={19} /><span>Loading your bookings…</span></div>
        ) : list.length === 0 && !linkedBookingId ? (
          <div className="submitter-booking-state">
            <span className="submitter-hub__empty-icon"><CalendarDays size={22} aria-hidden="true" /></span>
            <h4>No bookings to show</h4>
            <p>Your requests and confirmed visits will appear here after you submit one.</p>
          </div>
        ) : (
          <div className="submitter-booking-list">
            {showLinkedBooking && (
              <article className="submitter-booking-card" data-notification-target="true">
                <div className="submitter-booking-card__top">
                  <div>
                    <p className="submitter-booking-card__reference">{linkedBooking.reference}</p>
                    <h4>{linkedBooking.facilityName}</h4>
                    <p className="submitter-booking-card__purpose">{linkedBooking.purpose}</p>
                  </div>
                  <span className={`submitter-booking-status submitter-booking-status--${linkedBooking.status.toLowerCase()}`}>
                    <i aria-hidden="true" />{bookingStatusLabels[linkedBooking.status] ?? linkedBooking.status}
                  </span>
                </div>
                <div className="submitter-booking-card__actions">
                  <button type="button" className="submitter-booking-button" aria-expanded="true">
                    Booking details
                  </button>
                  {['PENDING', 'APPROVED'].includes(linkedBooking.status) && (
                    <button
                      type="button"
                      className="submitter-booking-button submitter-booking-button--quiet"
                      onClick={() => {
                        cancelBooking.reset();
                        setCancelId(linkedBooking.id);
                      }}
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
                <SubmitterBookingDetails query={detailsQuery} />
              </article>
            )}
            {linkedBookingId && !linkedBooking && !detailsQuery.isPending && detailsQuery.error && (
              <div className="submitter-booking-alert" role="alert">
                {detailsQuery.error.message || 'The linked booking could not be loaded.'}
              </div>
            )}
            {list.map((booking) => {
              const statusLabel = bookingStatusLabels[booking.status] ?? booking.status;
              const canCancel = ['PENDING', 'APPROVED'].includes(booking.status);
              return (
                <article
                  className="submitter-booking-card"
                  key={booking.id}
                  data-notification-target={booking.id === linkedBookingId ? 'true' : undefined}
                >
                  <div className="submitter-booking-card__top">
                    <div>
                      <p className="submitter-booking-card__reference">{booking.reference}</p>
                      <h4>{booking.facilityName}</h4>
                      <p className="submitter-booking-card__purpose">{booking.purpose}</p>
                    </div>
                    <span className={`submitter-booking-status submitter-booking-status--${booking.status.toLowerCase()}`}>
                      <i aria-hidden="true" />{statusLabel}
                    </span>
                  </div>
                  <div className="submitter-booking-card__meta">
                    <span><CalendarDays size={13} aria-hidden="true" />{formatBookingDate(booking.startsAt)}</span>
                    <span><Clock3 size={13} aria-hidden="true" />{formatBookingTime(booking.startsAt)}–{formatBookingTime(booking.endsAt)}</span>
                    <span><Users size={13} aria-hidden="true" />{booking.attendees} {booking.attendees === 1 ? 'attendee' : 'attendees'}</span>
                  </div>
                  <div className="submitter-booking-card__actions">
                    <button
                      type="button"
                      className="submitter-booking-button"
                      aria-expanded={detailsId === booking.id}
                      onClick={() => setDetailsId((current) => current === booking.id ? null : booking.id)}
                    >
                      {detailsId === booking.id ? 'Hide details' : 'Booking details'}
                    </button>
                    {canCancel && (
                      <button
                        type="button"
                        className="submitter-booking-button submitter-booking-button--quiet"
                        onClick={() => {
                          cancelBooking.reset();
                          setCancelId(booking.id);
                        }}
                      >
                        Cancel booking
                      </button>
                    )}
                  </div>
                  {detailsId === booking.id && <SubmitterBookingDetails query={detailsQuery} />}
                </article>
              );
            })}
          </div>
        )}
        {bookingsQuery.data?.totalPages > 1 && (
          <div className="submitter-booking-pagination">
            <span>Page {page + 1} of {bookingsQuery.data.totalPages}</span>
            <div>
              <button type="button" disabled={page === 0 || bookingsQuery.isFetching} onClick={() => setPage((current) => current - 1)}>
                <ChevronLeft size={13} aria-hidden="true" />Previous
              </button>
              <button type="button" disabled={page + 1 >= bookingsQuery.data.totalPages || bookingsQuery.isFetching} onClick={() => setPage((current) => current + 1)}>
                Next<ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
      <AlertDialog
        open={Boolean(cancelId)}
        onOpenChange={(open) => {
          if (!open && !cancelBooking.isPending) setCancelId(null);
        }}
      >
        <AlertDialogContent className="submitter-booking-cancel-dialog">
          <AlertDialogHeader className="submitter-booking-cancel-dialog__header">
            <span className="submitter-booking-cancel-dialog__icon"><Ban size={18} aria-hidden="true" /></span>
            <AlertDialogTitle className="submitter-booking-cancel-dialog__title">
              Cancel this booking?
            </AlertDialogTitle>
            <AlertDialogDescription className="submitter-booking-cancel-dialog__description">
              {bookingToCancel
                ? `Are you sure you want to cancel ${bookingToCancel.reference} for ${bookingToCancel.facilityName}? This action cannot be undone.`
                : 'Are you sure you want to cancel this booking? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelBooking.error && (
            <p className="submitter-booking-cancel-dialog__error" role="alert">
              {cancelBooking.error.message || 'The booking could not be cancelled. Please try again.'}
            </p>
          )}
          <AlertDialogFooter className="submitter-booking-cancel-dialog__footer">
            <button
              type="button"
              className="submitter-booking-button submitter-booking-button--quiet"
              disabled={cancelBooking.isPending}
              onClick={() => setCancelId(null)}
            >
              Keep booking
            </button>
            <button
              type="button"
              className="submitter-booking-button submitter-booking-button--danger"
              disabled={cancelBooking.isPending || !cancelId}
              onClick={() => cancel(cancelId)}
            >
              {cancelBooking.isPending ? <LoaderCircle className="spin" size={14} /> : <Ban size={14} />}
              {cancelBooking.isPending ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SubmitterBookingsPage({ token, onUnauthorized }) {
  return (
    <SubmitterWorkspacePage
      variant="bookings"
      title="Bookings"
      description="See facility requests, confirmations and upcoming visits in one place."
      icon={CalendarDays}
      previewLabel="BOOKING PLAN"
      previewTitle="Plan your facility visit"
      previewItems={[
        { label: 'Choose a facility', detail: 'Find the right space for your activity', icon: CalendarDays },
        { label: 'Share your plans', detail: 'Add a purpose and preferred time', icon: ClipboardList },
        { label: 'Get confirmation', detail: 'Check the booking decision', icon: CircleCheck },
        { label: 'Arrive prepared', detail: 'Review any visit instructions', icon: Check },
      ]}
      recordsTitle="Your bookings"
      recordsDescription="A schedule of booking activity linked to your account."
      emptyTitle="No bookings to show"
      emptyDescription="Your booking requests and confirmed visits will appear here."
      recordsContent={<SubmitterBookingRecords token={token} onUnauthorized={onUnauthorized} />}
    />
  );
}
