import { useState } from 'react';
import {
  Receipt,
  Clock,
  CheckCircle,
  X,
  Check,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  useInvoicesOverview,
  useVerifyInvoice,
  useReleaseReceipt,
  useRecordEvidence,
} from '@/hooks/useInvoices';

/**
 * Finance Officer - Price Lists & Invoices
 * Allows viewing authorised service rates, reviewing invoice payment evidence,
 * verifying client bank payments, and issuing official gated receipts.
 */
export function PriceListsInvoicesPage({ token, onUnauthorized }) {
  const { data: overview, isLoading, error } = useInvoicesOverview(token);
  const verifyMutation = useVerifyInvoice(token);
  const receiptMutation = useReleaseReceipt(token);
  const evidenceMutation = useRecordEvidence(token);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceToVerify, setInvoiceToVerify] = useState(null);
  const [selectedPriceItem, setSelectedPriceItem] = useState(null);
  const [evidenceInput, setEvidenceInput] = useState('');

  if (error?.status === 401) {
    onUnauthorized?.();
  }

  if (isLoading && !overview) {
    return (
      <div className="live-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p className="eyebrow" style={{ color: '#1b5e43' }}>LOADING INVOICES</p>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>Retrieving authorised price lists and invoice queue…</p>
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
      await verifyMutation.mutateAsync({ id: invoiceId });
      setInvoiceToVerify(null);
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev) => (prev ? { ...prev, status: 'Verified' } : null));
      }
    } catch (err) {
      alert(`Verification failed: ${err.message || 'Unknown error'}`);
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

  // Handle Record Evidence
  const handleRecordEvidence = async (invoiceId) => {
    if (!evidenceInput.trim()) return;
    try {
      const updated = await evidenceMutation.mutateAsync({
        id: invoiceId,
        paymentReference: evidenceInput.trim(),
      });
      setEvidenceInput('');
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(updated);
      }
    } catch (err) {
      alert(`Evidence recording failed: ${err.message}`);
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
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p
          className="eyebrow"
          style={{
            color: '#1b5e43',
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
            color: '#111827',
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, fontWeight: 400 }}>
          {subtitle}
        </p>
      </div>

      {/* Row 1: 3 KPI Metric Cards */}
      <section aria-label="Invoice and Revenue Metrics" className="invoices-overview-grid">
        {metrics.map((card) => {
          const isBurgundy = card.variant === 'burgundy';
          const cardClass = isBurgundy
            ? 'overview-metric-card card-burgundy'
            : 'overview-metric-card card-default';
          const labelColor = isBurgundy ? '#c99b8f' : '#6b7280';
          const valueColor = isBurgundy ? '#ffffff' : '#111827';

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
                    background: isBurgundy ? 'rgba(255, 255, 255, 0.12)' : '#eef7f0',
                    color: isBurgundy ? '#ffffff' : '#1b5e43',
                  }}
                >
                  {card.icon === 'Receipt' && <Receipt size={15} />}
                  {card.icon === 'Clock' && <Clock size={15} />}
                  {card.icon === 'CheckCircle' && <CheckCircle size={15} />}
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
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Authorised price list
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {priceList.map((item) => (
              <div
                key={item.id}
                className="price-list-row"
                onClick={() => setSelectedPriceItem(item)}
                style={{ cursor: 'pointer' }}
                title="Click to view rate breakdown"
              >
                <div style={{ fontSize: '13px', color: '#1f2937', fontWeight: 500 }}>
                  {item.service}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#374151',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.rate}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Invoices & payment verification */}
        <div className="invoices-panel-card">
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
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
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                    {inv.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
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
                      color: '#111827',
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
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  Verify Payment Evidence
                </h3>
                <small style={{ color: '#6b7280' }}>{invoiceToVerify.invoiceNumber}</small>
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

            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Service</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{invoiceToVerify.title}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Amount Due</span>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1b5e43' }}>{invoiceToVerify.amount}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Bank Reference</span>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: '#111827' }}>
                    {invoiceToVerify.paymentReference || 'BANK-STANBIC-9902'}
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 18px 0', lineHeight: 1.45 }}>
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
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  {renderStatusBadge(selectedInvoice.status)}
                </div>
                <small style={{ color: '#6b7280' }}>Issued on {selectedInvoice.date}</small>
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

            <div style={{ background: '#f8faf7', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Service Charge
                  </span>
                  <strong style={{ color: '#111827' }}>{selectedInvoice.title}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Invoice Amount
                  </span>
                  <strong style={{ color: '#1b5e43', fontSize: '15px' }}>{selectedInvoice.amount}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Client / Beneficiary
                  </span>
                  <strong style={{ color: '#111827' }}>{selectedInvoice.client}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Payment Reference
                  </span>
                  <strong style={{ color: '#111827', fontFamily: 'monospace' }}>
                    {selectedInvoice.paymentReference || 'None on record'}
                  </strong>
                </div>
              </div>

              {selectedInvoice.receiptNumber && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e3e7df', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#1b5e43', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Official Receipt: {selectedInvoice.receiptNumber}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>Receipt Released</span>
                </div>
              )}
            </div>

            {/* State-specific guidance */}
            {selectedInvoice.status === 'Pending evidence' && (
              <div style={{ marginBottom: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <AlertCircle size={14} /> Bank Evidence Required
                </div>
                <p style={{ fontSize: '11px', color: '#b45309', margin: '0 0 8px 0' }}>
                  Client has not yet submitted proof of bank deposit or EFT transfer. Record reference when received.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={evidenceInput}
                    onChange={(e) => setEvidenceInput(e.target.value)}
                    placeholder="Enter Bank EFT / Slip Ref (e.g. STANBIC-1029)"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => handleRecordEvidence(selectedInvoice.id)}
                    disabled={!evidenceInput.trim() || evidenceMutation.isPending}
                  >
                    Record
                  </button>
                </div>
              </div>
            )}

            {selectedInvoice.status === 'Verified' && !selectedInvoice.receiptNumber && (
              <div style={{ marginBottom: '16px', background: '#eef7f0', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1b5e43', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  <Check size={14} /> Payment Verified by Finance
                </div>
                <p style={{ fontSize: '11px', color: '#2d6a4f', margin: 0 }}>
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
                  onClick={() => alert(`Downloading Official Receipt ${selectedInvoice.receiptNumber}`)}
                >
                  <Download size={14} style={{ marginRight: 4 }} /> Download Receipt
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
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {selectedPriceItem.service}
                </h3>
                <small style={{ color: '#6b7280' }}>Category: {selectedPriceItem.category}</small>
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

            <div style={{ background: '#f8faf7', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Authorised Rate</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1b5e43', fontFamily: 'monospace' }}>
                  {selectedPriceItem.rate}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                Billing unit: {selectedPriceItem.unit}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {selectedPriceItem.description}
            </p>

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

