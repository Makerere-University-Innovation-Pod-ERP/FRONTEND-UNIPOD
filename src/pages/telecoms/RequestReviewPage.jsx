import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Info,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Send,
  Trash2,
  Undo2,
  User,
  Wrench,
} from 'lucide-react';
import {
  addDays,
  assessMaterials,
  canScheduleRequest,
  describeMaterialLine,
  formatUgx,
  REVIEW_STATUSES,
  SCHEDULE_BLOCKED_REASON,
  todayIso,
} from '@/lib/telecoms';
import { formatDate } from '@/lib/presentation';
import {
  useRequestTelecomsDetails,
  useSendBackTelecomsRequest,
  useSendTelecomsQuote,
  useTelecomsPriceList,
  useTelecomsRequest,
  useTelecomsRequests,
  useTelecomsStock,
  useUpdateTelecomsStatus,
} from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading, PaymentStatus, RequestStatus } from './shared';
import { useUnauthorizedRedirect } from './helpers';
import { CurvedSelect } from '@/components/CurvedSelect';

export function RequestReviewPage({ token, onUnauthorized }) {
  const requests = useTelecomsRequests(token);
  const [searchParams, setSearchParams] = useSearchParams();
  useUnauthorizedRedirect(onUnauthorized, requests.error);

  const queue = useMemo(
    () => (requests.data ?? []).filter((req) => REVIEW_STATUSES.includes(req.status)),
    [requests.data],
  );
  const drafts = useMemo(
    () => (requests.data ?? []).filter((req) => req.status === 'DRAFT'),
    [requests.data],
  );
  const selectedId = searchParams.get('request') || queue[0]?.id || '';

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · WORKFLOW 6.1"
        title="Request Review & Quote"
        intro="Verify parts availability, calculate diagnostic/testing fees from the price list, and issue official quotes."
      />
      <ErrorBanner error={requests.error} fallback="Could not load telecoms requests." />
      {requests.isLoading ? (
        <Loading label="Loading requests…" />
      ) : (
        <div className="review-workspace">
          <div className="review-queue-section">
            <div className="review-queue-header">
              <span className="review-queue-heading">
                Pending Requests ({queue.length})
              </span>
              {drafts.length > 0 && (
                <span className="review-queue-drafts-count">
                  {drafts.length} draft{drafts.length > 1 ? 's' : ''} in progress
                </span>
              )}
            </div>

            <nav className="review-queue-bar" aria-label="Requests to review">
              {queue.length === 0 && <p className="live-empty">No requests are waiting for review.</p>}
              {queue.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  className={`review-queue-card ${req.id === selectedId ? 'active' : ''}`}
                  aria-current={req.id === selectedId}
                  onClick={() => setSearchParams({ request: req.id })}
                >
                  <div className="queue-row-header">
                    <span className="queue-code-badge">{req.code}</span>
                    <RequestStatus status={req.status} />
                  </div>
                  <b className="queue-card-title">{req.serviceWanted}</b>
                  <div className="queue-card-meta">
                    <span>
                      <User size={12} /> {req.customerName} ({req.customerType})
                    </span>
                    {req.preferredDate && (
                      <span className="queue-date-pill">
                        <Calendar size={11} /> Target: {formatDate(req.preferredDate)}
                      </span>
                    )}
                  </div>
                  {req.status === 'QUOTED' && (
                    <div className="queue-row-footer">
                      <PaymentStatus status={req.payment.status} />
                    </div>
                  )}
                </button>
              ))}

              {drafts.map((req) => (
                <Link
                  key={req.id}
                  className="review-queue-card review-queue-draft"
                  to={`/telecoms/requests/new?draft=${encodeURIComponent(req.id)}`}
                >
                  <div className="queue-row-header">
                    <span className="queue-code-badge">DRAFT</span>
                    <span className="stock-pill low">Draft</span>
                  </div>
                  <b className="queue-card-title">{req.serviceWanted || 'Untitled request'}</b>
                  <div className="queue-card-meta">
                    <span>
                      <User size={12} /> {req.customerName || 'No customer'}
                    </span>
                    <span style={{ color: 'var(--forest)', fontWeight: 600 }}>Resume editing →</span>
                  </div>
                </Link>
              ))}
            </nav>
          </div>

          {selectedId ? (
            <ReviewPanel key={selectedId} token={token} id={selectedId} onUnauthorized={onUnauthorized} />
          ) : (
            <section className="live-panel">
              <p className="live-empty">Select a request from the queue to review.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ token, id, onUnauthorized }) {
  const requestQuery = useTelecomsRequest(token, id);
  const stockQuery = useTelecomsStock(token);
  const priceListQuery = useTelecomsPriceList(token);
  useUnauthorizedRedirect(onUnauthorized, requestQuery.error, stockQuery.error, priceListQuery.error);

  if (requestQuery.isLoading || stockQuery.isLoading || priceListQuery.isLoading) {
    return (
      <section className="live-panel">
        <Loading label="Loading request details…" />
      </section>
    );
  }
  if (!requestQuery.data) {
    return (
      <section className="live-panel">
        <ErrorBanner error={requestQuery.error} fallback="This request could not be loaded." />
      </section>
    );
  }

  return (
    <ReviewForm
      key={requestQuery.data.updatedAt}
      token={token}
      request={requestQuery.data}
      stockItems={stockQuery.data ?? []}
      priceList={priceListQuery.data ?? []}
      onUnauthorized={onUnauthorized}
    />
  );
}

function ReviewForm({ token, request, stockItems, priceList, onUnauthorized }) {
  const editable = request.status === 'NEW' || request.status === 'AWAITING_DETAILS';
  const initialPrice = priceList.find(
    (item) => item.id === (request.quote?.priceListItemId ?? request.estimate?.priceListItemId),
  );
  const [parts, setParts] = useState(request.estimate?.parts ?? []);
  const [priceListItemId, setPriceListItemId] = useState(initialPrice?.id ?? '');
  const [priceQuantity, setPriceQuantity] = useState(
    request.quote?.priceQuantity ?? request.estimate?.priceQuantity ?? 1,
  );
  const [expectedCompletion, setExpectedCompletion] = useState(
    request.quote?.expectedCompletion ?? (initialPrice ? addDays(todayIso(), initialPrice.leadDays) : ''),
  );
  const [panel, setPanel] = useState(null);
  const [message, setMessage] = useState('');

  const sendQuote = useSendTelecomsQuote(token, request.id);
  const requestDetails = useRequestTelecomsDetails(token, request.id);
  const sendBack = useSendBackTelecomsRequest(token, request.id);
  const updateStatus = useUpdateTelecomsStatus(token, request.id);
  useUnauthorizedRedirect(
    onUnauthorized,
    sendQuote.error,
    requestDetails.error,
    sendBack.error,
    updateStatus.error,
  );

  const assessedParts = useMemo(() => assessMaterials(parts, stockItems), [parts, stockItems]);
  const partsShort = assessedParts.some((line) => !line.sufficient);
  const selectedPriceItem = priceList.find((item) => item.id === priceListItemId);
  const quoteAmount = selectedPriceItem ? selectedPriceItem.unitPrice * Number(priceQuantity || 0) : 0;
  const canSendQuote = Boolean(selectedPriceItem) && Number(priceQuantity) > 0 && !partsShort && expectedCompletion;
  const isPaid = request.payment.status === 'CONFIRMED';
  const canSchedule = canScheduleRequest(request);

  const onPriceItemChange = (event) => {
    const nextId = event.target.value;
    setPriceListItemId(nextId);
    const item = priceList.find((candidate) => candidate.id === nextId);
    if (item && !request.quote) {
      setExpectedCompletion(addDays(todayIso(), item.leadDays));
    }
  };

  const addPart = () => {
    const unused = stockItems.find((candidate) => !parts.some((line) => line.itemId === candidate.id));
    if (unused) setParts((current) => [...current, { itemId: unused.id, quantity: 1 }]);
  };

  const updatePart = (index, field, value) => {
    setParts((current) =>
      current.map((line, i) => (i === index ? { ...line, [field]: field === 'quantity' ? Number(value) : value } : line)),
    );
  };

  const removePart = (index) => {
    setParts((current) => current.filter((_, i) => i !== index));
  };

  const onSendQuote = () => {
    if (!canSendQuote) return;
    void sendQuote.mutateAsync({
      amount: quoteAmount,
      priceListItemId,
      priceQuantity: Number(priceQuantity),
      expectedCompletion,
      estimate: { parts, priceListItemId, priceQuantity: Number(priceQuantity) },
    });
  };

  const onMoveToScheduled = () => {
    void updateStatus.mutateAsync('SCHEDULED');
  };

  const onSendMessage = () => {
    if (!message.trim()) return;
    if (panel === 'details') {
      void requestDetails.mutateAsync(message.trim()).then(() => {
        setPanel(null);
        setMessage('');
      });
    } else if (panel === 'back') {
      void sendBack.mutateAsync(message.trim()).then(() => {
        setPanel(null);
        setMessage('');
      });
    }
  };

  const scheduleInsight = useMemo(() => {
    if (!request.preferredDate || !expectedCompletion) {
      return {
        type: 'info',
        diffDays: null,
        message: request.preferredDate
          ? `Client requested completion by ${formatDate(request.preferredDate)}. Select a service rate to view estimated lab delivery.`
          : 'No specific completion date requested by the client. Standard diagnostic lead times apply.',
      };
    }
    const prefTime = new Date(request.preferredDate).getTime();
    const compTime = new Date(expectedCompletion).getTime();
    const diffDays = Math.round((prefTime - compTime) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return {
        type: 'positive',
        diffDays,
        message: `On schedule: Lab completion (${formatDate(expectedCompletion)}) is ${diffDays} day${diffDays > 1 ? 's' : ''} ahead of client's preferred date (${formatDate(request.preferredDate)}).`,
      };
    }
    if (diffDays === 0) {
      return {
        type: 'exact',
        diffDays: 0,
        message: `On schedule: Lab completion aligns with client's preferred date (${formatDate(request.preferredDate)}) exactly.`,
      };
    }
    const late = Math.abs(diffDays);
    return {
      type: 'warning',
      diffDays,
      message: `Schedule alert: Lab completion (${formatDate(expectedCompletion)}) is ${late} day${late > 1 ? 's' : ''} after client's preferred date (${formatDate(request.preferredDate)}). Align with client before quoting.`,
    };
  }, [request.preferredDate, expectedCompletion]);

  return (
    <section className="live-panel" aria-labelledby="review-heading">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">{request.code ?? 'REQUEST'}</p>
          <h2 id="review-heading" className="tx-panel-title">{request.serviceWanted}</h2>
        </div>
        <div className="tx-row-status">
          <RequestStatus status={request.status} />
          {request.status === 'QUOTED' && <PaymentStatus status={request.payment.status} />}
        </div>
      </div>

      <ErrorBanner
        error={sendQuote.error || requestDetails.error || sendBack.error || updateStatus.error}
        fallback="Action failed."
      />

      <div className="tx-review">
        <div className="tx-stack">
          {/* Customer & Equipment Overview */}
          <dl className="tx-facts" style={{ marginBottom: 16 }}>
            <div>
              <dt>Customer</dt>
              <dd><b>{request.customerName}</b> ({request.customerType})</dd>
            </div>
            <div>
              <dt>Equipment Involved</dt>
              <dd>{request.equipmentInvolved || 'None specified'}</dd>
            </div>
          </dl>

          {/* Timeline & Schedule Alignment Card */}
          <div className="tx-schedule-card">
            <div className="tx-schedule-header">
              <Calendar className="tx-schedule-icon" size={20} color="#0b3426" />
              <div>
                <h4>Schedule & Delivery Alignment</h4>
                <p>Compare customer requested target against lab diagnostic lead time</p>
              </div>
            </div>

            <div className="tx-schedule-grid">
              <div className="tx-schedule-milestone">
                <span className="milestone-label">1. Intake Date</span>
                <b className="milestone-date">{formatDate(request.createdAt)}</b>
                <span className="milestone-desc">Logged at reception</span>
              </div>
              <div className="tx-schedule-arrow" aria-hidden="true">➔</div>
              <div className="tx-schedule-milestone highlight-client">
                <span className="milestone-label">2. Customer Preferred Date</span>
                <b className="milestone-date">
                  {request.preferredDate ? formatDate(request.preferredDate) : 'Not specified'}
                </b>
                <span className="milestone-desc">Client target completion</span>
              </div>
              <div className="tx-schedule-arrow" aria-hidden="true">➔</div>
              <div className="tx-schedule-milestone highlight-lab">
                <span className="milestone-label">3. Estimated Lab Delivery</span>
                <b className="milestone-date">
                  {expectedCompletion ? formatDate(expectedCompletion) : 'Pending selection'}
                </b>
                <span className="milestone-desc">
                  {selectedPriceItem ? `${selectedPriceItem.leadDays} day(s) lead time` : 'Set rate below'}
                </span>
              </div>
            </div>

            <div className={`tx-schedule-comparison ${scheduleInsight.type}`}>
              {scheduleInsight.type === 'positive' || scheduleInsight.type === 'exact' ? (
                <CheckCircle2 size={16} />
              ) : scheduleInsight.type === 'warning' ? (
                <AlertTriangle size={16} />
              ) : (
                <Info size={16} />
              )}
              <span>{scheduleInsight.message}</span>
            </div>
          </div>

          <h3 className="tx-subhead">Required Parts & Stock Feasibility</h3>
          {assessedParts.length === 0 ? (
            <p className="live-empty">No parts estimated from stock.</p>
          ) : (
            <ul className="tx-materials">
              {assessedParts.map((line, index) => {
                const stockStatusClass = !line.sufficient ? 'short' : line.lowAfter ? 'low' : 'sufficient';
                const statusLabel = !line.sufficient
                  ? `Insufficient stock: need ${line.quantity}, only ${line.balance} available`
                  : line.lowAfter
                    ? `Low stock alert: only ${line.balance - line.quantity} left after use`
                    : `${line.balance} available in stock`;

                return (
                  <li key={line.itemId}>
                    <div className={`tx-material-card ${stockStatusClass}`}>
                      <div className="tx-material-info">
                        <span className="tx-material-name">{line.item?.name ?? line.itemId}</span>
                        <span className={`stock-pill ${stockStatusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      {editable && (
                        <div className="tx-material-controls">
                          <div className="part-qty-box">
                            <label htmlFor={`part-qty-${line.itemId}`}>Qty:</label>
                            <input
                              id={`part-qty-${line.itemId}`}
                              type="number"
                              min="1"
                              aria-label={`Quantity of ${line.item?.name}`}
                              value={line.quantity}
                              onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="tx-btn-trash"
                            onClick={() => removePart(index)}
                            aria-label="Remove part"
                            title="Remove part"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {editable && stockItems.length > parts.length && (
            <button type="button" className="btn btn-outline" onClick={addPart}>
              <Plus size={14} />Add part from stock
            </button>
          )}

          <div className="tx-actions">
            {editable && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setPanel(panel === 'details' ? null : 'details'); setMessage(''); }}
                >
                  <MessageSquareText size={14} />Ask customer for details
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setPanel(panel === 'back' ? null : 'back'); setMessage(''); }}
                >
                  <Undo2 size={14} />Send back to reception
                </button>
              </>
            )}
          </div>

          {panel && (
            <div className="tx-inline-form">
              <label htmlFor="tl-panel-msg">
                {panel === 'details' ? 'Note to customer (what needs clarification):' : 'Reason for sending back:'}
              </label>
              <textarea
                id="tl-panel-msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write clear and polite instructions…"
              />
              <div className="tx-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!message.trim() || requestDetails.isPending || sendBack.isPending}
                  onClick={onSendMessage}
                >
                  <Send size={14} />Send
                </button>
                <button type="button" className="btn" onClick={() => setPanel(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Right side: Quote & Payment Card */}
        <div className="tx-quote-card" role="region" aria-label="Quote">
          <p className="tx-quote-label">OFFICIAL QUOTE</p>
          <div className="tx-quote-amount">
            {formatUgx(request.quote ? request.quote.amount : quoteAmount)}
          </div>

          {request.quote ? (
            <div className="tx-payment">
              <PaymentStatus status={request.payment.status} />
              <p>
                <b>Invoice:</b> {request.code}-INV<br />
                <b>Reference:</b> {request.payment.reference || 'Pending bank payment'}<br />
                <b>Estimated completion:</b> {formatDate(request.quote.expectedCompletion)}
              </p>
              {isPaid ? (
                <p className="tx-success">
                  Payment confirmed by Finance. Scheduling unlocked.
                </p>
              ) : (
                <p className="tx-quote-reason">
                  Bank payment proof must be verified by Finance before work is scheduled (Rule 7).
                </p>
              )}
            </div>
          ) : (
            <div className="tx-quote-fields">
              <label>
                Service Category / Rate
                <CurvedSelect
                  value={priceListItemId}
                  placeholder="Select standard rate…"
                  options={[
                    { value: '', label: 'Select standard rate…' },
                    ...priceList.map((item) => ({
                      value: item.id,
                      label: `${item.label} — ${formatUgx(item.unitPrice)}`,
                    })),
                  ]}
                  onChange={onPriceItemChange}
                  disabled={!editable}
                />
              </label>

              <div className="tx-quote-row">
                <label>
                  Quantity / Hours
                  <input
                    type="number"
                    min="1"
                    value={priceQuantity}
                    onChange={(e) => setPriceQuantity(e.target.value)}
                    disabled={!editable}
                  />
                </label>
                <label>
                  Completion Date
                  <input
                    type="date"
                    min={todayIso()}
                    value={expectedCompletion}
                    onChange={(e) => setExpectedCompletion(e.target.value)}
                    disabled={!editable}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="tx-quote-actions">
            {!request.quote ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSendQuote || sendQuote.isPending}
                onClick={onSendQuote}
              >
                {sendQuote.isPending ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />}
                Send quote
              </button>
            ) : request.status === 'QUOTED' ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canSchedule || updateStatus.isPending}
                  onClick={onMoveToScheduled}
                >
                  {updateStatus.isPending ? <LoaderCircle className="spin" size={14} /> : <CalendarCheck size={14} />}
                  Move to Scheduled
                </button>
                {!canSchedule && (
                  <p className="tx-quote-reason">{SCHEDULE_BLOCKED_REASON}</p>
                )}
              </>
            ) : (
              <Link className="btn btn-outline" to={`/telecoms/requests/${request.id}`}>
                View request details<ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
