import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Clock,
  CheckCircle,
  FileText,
  X,
  Check,
  AlertCircle,
  Download,
  DollarSign,
} from 'lucide-react';
import {
  useInvoicesOverview,
  useVerifyInvoice,
  useRejectInvoice,
  useReleaseReceipt,
  useDownloadPaymentProof,
  useDownloadInvoiceReceipt,
} from '@/hooks/useInvoices';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

function downloadBlob(file, filename) {
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

/**
 * Finance Officer - Price Lists & Invoices
 * Allows viewing authorised service rates, reviewing invoice payment evidence,
 * verifying client bank payments, and issuing official gated receipts.
 */
export function PriceListsInvoicesPage({ token, onUnauthorized }) {
  const { data: overview, isLoading, error, refetch, isFetching } = useInvoicesOverview(token);
  const [searchParams] = useSearchParams();
  const verifyMutation = useVerifyInvoice(token);
  const rejectMutation = useRejectInvoice(token);
  const receiptMutation = useReleaseReceipt(token);
  const proofDownloadMutation = useDownloadPaymentProof(token);
  const receiptDownloadMutation = useDownloadInvoiceReceipt(token);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceToVerify, setInvoiceToVerify] = useState(null);
  const [selectedPriceItem, setSelectedPriceItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const linkedInvoiceId = searchParams.get('invoice');

  useEffect(() => {
    if (error?.status === 401) onUnauthorized?.();
  }, [error, onUnauthorized]);

  useEffect(() => {
    if (!linkedInvoiceId || !overview) return;
    const invoice = overview.invoices.find((item) => item.id === linkedInvoiceId);
    if (invoice) setSelectedInvoice(invoice);
  }, [linkedInvoiceId, overview]);

  if (isLoading && !overview) {
    return <LoadingSkeleton label="Loading authorised prices and invoice queue…" variant="invoices" />;
  }

  if (error && !overview) {
    return (
      <div className="live-panel" role="alert" style={{ padding: '24px' }}>
        <p className="eyebrow" style={{ color: 'var(--rose)' }}>PAYMENTS UNAVAILABLE</p>
        <p style={{ color: 'var(--muted)', marginTop: '8px' }}>
          {error.message || 'Could not load invoices and authorised prices from the backend.'}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  const {
    eyebrow = 'FINANCE',
    title = 'Price Lists & Invoices',
    subtitle = 'Authorised service charges, verification queue and receipts.',
    metrics = [],
    priceList = [],
    invoices = [],
  } = overview || {};

  // Handle Verify Confirmation
  const handleConfirmVerify = async (invoiceId) => {
    try {
      const proofId = invoiceToVerify?.paymentProof?.id;
      if (!proofId) {
        throw new Error('No uploaded payment proof exists for this invoice yet.');
      }

      await verifyMutation.mutateAsync({ id: invoiceId, proofId });
      setInvoiceToVerify(null);
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev) => (prev ? { ...prev, status: 'Verified' } : null));
      }
    } catch (err) {
      alert(`Verification failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRejectPayment = async (invoice) => {
    const reason = rejectionReason.trim();
    const proofId = invoice.paymentProof?.id;
    if (!proofId || !reason) return;

    try {
      const updated = await rejectMutation.mutateAsync({
        id: invoice.id,
        proofId,
        reason,
      });
      setSelectedInvoice(updated);
      setRejectionReason('');
    } catch (err) {
      alert(`Payment proof rejection failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDownloadProof = async (invoice) => {
    try {
      const file = await proofDownloadMutation.mutateAsync({ id: invoice.id });
      downloadBlob(file, invoice.paymentProof?.originalFilename || `${invoice.invoiceNumber}-payment-proof`);
    } catch (err) {
      alert(`Payment proof download failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDownloadReceipt = async (invoice) => {
    try {
      const file = await receiptDownloadMutation.mutateAsync({ id: invoice.id });
      downloadBlob(file, `${invoice.receiptNumber || invoice.invoiceNumber}-receipt.txt`);
    } catch (err) {
      alert(`Receipt download failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle Receipt Release
  const handleReleaseReceipt = async (invoiceId) => {
    try {
      const updated = await receiptMutation.mutateAsync({ id: invoiceId });
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(updated);
      }
    } catch (err) {
      alert(`Receipt generation failed: ${err.message || 'Payment must be verified first'}`);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    let dotColor = '#1b5e43';
    let bgColor = '#e8f5ec';
    let textColor = '#1b5e43';

    if (status === 'Pending evidence') {
      dotColor = '#d97706';
      bgColor = '#fef3c7';
      textColor = '#b45309';
    } else if (status === 'Awaiting verification') {
      dotColor = '#d97706';
      bgColor = '#fef3c7';
      textColor = '#b45309';
    } else if (status === 'Verified' || status === 'Receipted') {
      dotColor = '#1b5e43';
      bgColor = '#e8f5ec';
      textColor = '#1b5e43';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '9999px',
          backgroundColor: bgColor,
          color: textColor,
          fontSize: '11px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: dotColor,
            display: 'inline-block',
          }}
        />
        {status}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '32px' }}>
      {error && (
        <div role="alert" className="submitter-invoice-alert" style={{ marginBottom: '16px' }}>
          <span>{error.message || 'The latest finance data could not be refreshed.'}</span>
          <button type="button" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p
          className="eyebrow"
          style={{
            color: 'var(--green)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: 'Newsreader, Georgia, serif',
            fontSize: '34px',
            fontWeight: 400,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, fontWeight: 400 }}>
          {subtitle}
        </p>
      </div>

      {/* Finance summary metrics */}
      <section aria-label="Finance Summary Metrics" className="invoices-overview-grid">
        {metrics.map((card) => {
          const isBurgundy = card.variant === 'burgundy';
          const isForest = card.variant === 'forest';
          const cardClass = isBurgundy
            ? 'overview-metric-card card-burgundy'
            : isForest
            ? 'overview-metric-card card-forest'
            : 'overview-metric-card card-default';
          const labelColor = isBurgundy ? '#c99b8f' : isForest ? '#9ec5b1' : 'var(--muted)';
          const valueColor = isBurgundy || isForest ? '#ffffff' : 'var(--ink)';

          return (
            <div key={card.id} className={cardClass} style={{ minHeight: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: labelColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </span>

                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isBurgundy ? 'rgba(255, 255, 255, 0.12)' : 'var(--green-bg)',
                    color: isBurgundy ? '#ffffff' : 'var(--green)',
                  }}
                >
                  {card.icon === 'Receipt' && <Receipt size={15} />}
                  {card.icon === 'Clock' && <Clock size={15} />}
                  {card.icon === 'CheckCircle' && <CheckCircle size={15} />}
                  {card.icon === 'FileText' && <FileText size={15} />}
                  {card.icon === 'AlertCircle' && <AlertCircle size={15} />}
                  {card.icon === 'DollarSign' && <DollarSign size={15} />}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <span
                  style={{
                    fontSize: '34px',
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: valueColor,
                  }}
                >
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Row 2: Authorised price list & Invoices & payment verification */}
      <section aria-label="Price Lists and Invoices Management" className="invoices-bottom-grid">
        {/* Left: Authorised price list */}
        <div className="invoices-panel-card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px 0' }}>
            Authorised price list
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {priceList.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '12px', padding: '8px 0' }}>
                No authorised price list is currently published.
              </div>
            ) : (
              priceList.map((item) => (
                <div
                  key={item.id}
                  className="price-list-row"
                  onClick={() => setSelectedPriceItem(item)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view rate breakdown"
                >
                  <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>
                    {item.service}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--ink-soft)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.rate}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Invoices & payment verification */}
        <div className="invoices-panel-card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px 0' }}>
            Invoices & payment verification
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="invoice-item-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedInvoice(inv)}
              >
                {/* Left: Invoice Number & Subtitle */}
                <div style={{ minWidth: 0, paddingRight: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                    {inv.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {inv.title}
                  </div>
                </div>

                {/* Right: Amount, Status, and Action Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    {inv.amount}
                  </span>

                  {renderStatusBadge(inv.status)}

                  {inv.status === 'Awaiting verification' && (
                    <button
                      type="button"
                      className="btn-verify"
                      onClick={() => setInvoiceToVerify(inv)}
                      title="Verify client payment evidence"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal: Verify Payment Confirmation */}
      {invoiceToVerify && (
        <div className="modal-backdrop" onClick={() => setInvoiceToVerify(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                  Verify Payment Evidence
                </h3>
                <small style={{ color: 'var(--muted)' }}>{invoiceToVerify.invoiceNumber}</small>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceToVerify(null)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--surface-raised)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Service</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{invoiceToVerify.title}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Amount Due</span>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>{invoiceToVerify.amount}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Bank Reference</span>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--ink)' }}>
                    {invoiceToVerify.paymentReference || 'No reference provided'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Amount on Proof</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {invoiceToVerify.paymentProof?.amount != null
                      ? `UGX ${Number(invoiceToVerify.paymentProof.amount).toLocaleString('en-US')}`
                      : 'Not provided'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Paid On</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {invoiceToVerify.paymentProof?.paidOn || 'Not provided'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '18px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDownloadProof(invoiceToVerify)}
                disabled={!invoiceToVerify.paymentProof || proofDownloadMutation.isPending}
              >
                <Download size={14} style={{ marginRight: 4 }} />
                {proofDownloadMutation.isPending ? 'Downloading…' : 'Download Payment Proof'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 18px 0', lineHeight: 1.45 }}>
              Confirm that the bank funds of <strong>{invoiceToVerify.amount}</strong> have cleared in the Makerere UniPod operating account. Verification unlocks official receipt release.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInvoiceToVerify(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleConfirmVerify(invoiceToVerify.id)}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? 'Verifying…' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invoice & Receipt Details */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  {renderStatusBadge(selectedInvoice.status)}
                </div>
                <small style={{ color: 'var(--muted)' }}>Issued on {selectedInvoice.date}</small>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--surface-raised)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Service Charge
                  </span>
                  <strong style={{ color: 'var(--ink)' }}>{selectedInvoice.title}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Invoice Amount
                  </span>
                  <strong style={{ color: 'var(--green)', fontSize: '15px' }}>{selectedInvoice.amount}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Client / Beneficiary
                  </span>
                  <strong style={{ color: 'var(--ink)' }}>{selectedInvoice.client}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Payment Reference
                  </span>
                  <strong style={{ color: 'var(--ink)', fontFamily: 'monospace' }}>
                    {selectedInvoice.paymentReference || 'None on record'}
                  </strong>
                </div>
              </div>

              {selectedInvoice.paymentProof && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--muted)' }}>
                      Proof amount: {selectedInvoice.paymentProof.amount != null
                        ? `UGX ${Number(selectedInvoice.paymentProof.amount).toLocaleString('en-US')}`
                        : 'Not provided'}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>Paid on: {selectedInvoice.paymentProof.paidOn || 'Not provided'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDownloadProof(selectedInvoice)}
                    disabled={proofDownloadMutation.isPending}
                  >
                    <Download size={14} style={{ marginRight: 4 }} />
                    {proofDownloadMutation.isPending ? 'Downloading…' : 'Download Payment Proof'}
                  </button>
                </div>
              )}

              {selectedInvoice.receiptNumber && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Official Receipt: {selectedInvoice.receiptNumber}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Receipt Released</span>
                </div>
              )}
            </div>

            {/* State-specific guidance */}
            {selectedInvoice.status === 'Pending evidence' && (
              <div style={{ marginBottom: '16px', background: 'var(--amber-bg)', border: '1px solid color-mix(in srgb, var(--amber) 35%, var(--border))', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amber)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <AlertCircle size={14} /> Bank Evidence Required
                </div>
                <p style={{ fontSize: '11px', color: 'var(--amber)', margin: 0 }}>
                  {selectedInvoice.paymentProof?.status === 'REJECTED'
                    ? `Previous proof rejected${selectedInvoice.paymentProof.rejectionReason ? `: ${selectedInvoice.paymentProof.rejectionReason}` : '.'} Waiting for the client to upload new proof.`
                    : 'Waiting for the client to upload payment proof.'}
                </p>
              </div>
            )}

            {selectedInvoice.status === 'Awaiting verification' && (
              <div style={{ marginBottom: '16px', background: 'var(--amber-bg)', border: '1px solid color-mix(in srgb, var(--amber) 35%, var(--border))', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amber)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                  <AlertCircle size={14} /> Review Submitted Payment Proof
                </div>
                <label htmlFor="invoice-rejection-reason" style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '5px' }}>
                  Rejection reason (required to reject)
                </label>
                <textarea
                  id="invoice-rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Explain what needs to be corrected"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', resize: 'vertical' }}
                />
                {selectedInvoice.paymentProof?.status === 'REJECTED' && (
                  <p style={{ fontSize: '11px', color: 'var(--amber)', margin: '6px 0 0' }}>
                    Previous proof rejected{selectedInvoice.paymentProof.rejectionReason ? `: ${selectedInvoice.paymentProof.rejectionReason}` : '.'}
                  </p>
                )}
              </div>
            )}

            {selectedInvoice.status === 'Verified' && !selectedInvoice.receiptNumber && (
              <div style={{ marginBottom: '16px', background: 'var(--green-bg)', border: '1px solid color-mix(in srgb, var(--green) 25%, var(--border))', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  <Check size={14} /> Payment Verified by Finance
                </div>
                <p style={{ fontSize: '11px', color: 'var(--green)', margin: 0 }}>
                  This payment is verified. You can now release the official stamped receipt.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>

              {selectedInvoice.status === 'Awaiting verification' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRejectPayment(selectedInvoice)}
                    disabled={!selectedInvoice.paymentProof?.id || !rejectionReason.trim() || rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? 'Rejecting…' : 'Reject Proof'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setInvoiceToVerify(selectedInvoice);
                      setSelectedInvoice(null);
                    }}
                  >
                    Verify Payment
                  </button>
                </>
              )}

              {selectedInvoice.status === 'Verified' && !selectedInvoice.receiptNumber && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleReleaseReceipt(selectedInvoice.id)}
                  disabled={receiptMutation.isPending}
                >
                  {receiptMutation.isPending ? 'Releasing…' : 'Release Official Receipt'}
                </button>
              )}

              {selectedInvoice.status === 'Receipted' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDownloadReceipt(selectedInvoice)}
                  disabled={receiptDownloadMutation.isPending}
                >
                  <Download size={14} style={{ marginRight: 4 }} />
                  {receiptDownloadMutation.isPending ? 'Downloading…' : 'Download Receipt'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Price Item Details */}
      {selectedPriceItem && (
        <div className="modal-backdrop" onClick={() => setSelectedPriceItem(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                  {selectedPriceItem.service}
                </h3>
                <small style={{ color: 'var(--muted)' }}>
                  {selectedPriceItem.category
                    ? `Category: ${selectedPriceItem.category}`
                    : `Effective from ${selectedPriceItem.effectiveFrom || 'date not provided'}`}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPriceItem(null)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--surface-raised)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Authorised Rate</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)', fontFamily: 'monospace' }}>
                  {selectedPriceItem.rate}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Billing unit: {selectedPriceItem.unit}
              </div>
            </div>

            {selectedPriceItem.description && (
              <p style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {selectedPriceItem.description}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedPriceItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

