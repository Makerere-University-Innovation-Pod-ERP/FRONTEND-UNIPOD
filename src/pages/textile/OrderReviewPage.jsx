import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck, LoaderCircle, MessageSquareText, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import {
  REVIEW_STATUSES, SCHEDULE_BLOCKED_REASON, addDays, assessMaterials, canScheduleOrder,
  describeMaterialLine, formatUgx, todayIso,
} from '@/lib/textile';
import { formatDate } from '@/lib/presentation';
import {
  useOrderTransition, usePriceList, useRequestDetails, useSendBack, useSendQuote, useStock, useTextileOrder, useTextileOrders,
} from '@/hooks/useTextile';
import { ErrorBanner, Loading, OrderStatus, PageHeading, PaymentStatus } from './shared';
import { useUnauthorizedRedirect } from './helpers';

export function OrderReviewPage({ token, onUnauthorized }) {
  const orders = useTextileOrders(token);
  const [searchParams, setSearchParams] = useSearchParams();
  useUnauthorizedRedirect(onUnauthorized, orders.error);

  const queue = useMemo(() => (orders.data ?? []).filter((order) => REVIEW_STATUSES.includes(order.status)), [orders.data]);
  const drafts = useMemo(() => (orders.data ?? []).filter((order) => order.status === 'DRAFT'), [orders.data]);
  const selectedId = searchParams.get('order') || queue[0]?.id || '';

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TEXTILE · ORDER"
        title="Order Review & Quote"
        intro="Confirm feasibility against stock and send a price before any work begins."
      />
      <ErrorBanner error={orders.error} fallback="Could not load orders." />
      {orders.isLoading ? <Loading label="Loading orders…" /> : (
        <div className="queue-grid">
          <nav className="queue-list" aria-label="Orders to review">
            {queue.length === 0 && <p className="live-empty">No orders are waiting for review.</p>}
            {queue.map((order) => (
              <button
                key={order.id}
                type="button"
                className={`queue-row ${order.id === selectedId ? 'active' : ''}`}
                aria-current={order.id === selectedId}
                onClick={() => setSearchParams({ order: order.id })}
              >
                <b>{order.whatIsWanted}</b>
                <small>{order.code} · {order.customerName} · {order.customerType}</small>
                <span className="tx-row-status"><OrderStatus status={order.status} />{order.status === 'QUOTED' && <PaymentStatus status={order.payment.status} />}</span>
              </button>
            ))}
            {drafts.length > 0 && (
              <div className="tx-drafts">
                <p className="eyebrow">DRAFTS</p>
                {drafts.map((order) => (
                  <Link key={order.id} className="tx-draft-link" to={`/textile/orders/new?draft=${encodeURIComponent(order.id)}`}>
                    <b>{order.whatIsWanted || 'Untitled order'}</b><small>{order.customerName} · continue editing</small>
                  </Link>
                ))}
              </div>
            )}
          </nav>
          {selectedId
            ? <ReviewPanel key={selectedId} token={token} id={selectedId} onUnauthorized={onUnauthorized} />
            : <section className="live-panel"><p className="live-empty">Select an order to review.</p></section>}
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ token, id, onUnauthorized }) {
  const order = useTextileOrder(token, id);
  const stock = useStock(token);
  const priceList = usePriceList(token);
  useUnauthorizedRedirect(onUnauthorized, order.error, stock.error, priceList.error);

  if (order.isLoading || stock.isLoading || priceList.isLoading) return <section className="live-panel"><Loading label="Loading order…" /></section>;
  if (!order.data) return <section className="live-panel"><ErrorBanner error={order.error} fallback="This order could not be loaded." /></section>;

  return (
    <ReviewForm
      key={order.data.updatedAt}
      token={token}
      order={order.data}
      stockItems={stock.data?.items ?? []}
      priceList={priceList.data ?? []}
      onUnauthorized={onUnauthorized}
    />
  );
}

function ReviewForm({ token, order, stockItems, priceList, onUnauthorized }) {
  const editable = order.status === 'NEW' || order.status === 'AWAITING_DETAILS';
  const initialPrice = priceList.find((item) => item.id === (order.quote?.priceListItemId ?? order.estimate?.priceListItemId));
  const [materials, setMaterials] = useState(order.estimate?.materials ?? []);
  const [priceListItemId, setPriceListItemId] = useState(initialPrice?.id ?? '');
  const [priceQuantity, setPriceQuantity] = useState(order.quote?.priceQuantity ?? order.estimate?.priceQuantity ?? 1);
  const [expectedCompletion, setExpectedCompletion] = useState(
    order.quote?.expectedCompletion ?? (initialPrice ? addDays(todayIso(), initialPrice.leadDays) : ''),
  );
  const [panel, setPanel] = useState(null);
  const [message, setMessage] = useState('');

  const sendQuote = useSendQuote(token, order.id);
  const requestDetails = useRequestDetails(token, order.id);
  const sendBack = useSendBack(token, order.id);
  const schedule = useOrderTransition(token, order.id);
  useUnauthorizedRedirect(onUnauthorized, sendQuote.error, requestDetails.error, sendBack.error, schedule.error);

  const price = priceList.find((item) => item.id === priceListItemId);
  const assessed = assessMaterials(materials, stockItems);
  const shortfall = assessed.some((line) => !line.sufficient);
  const amount = order.quote?.amount ?? (price ? price.unitPrice * (Number(priceQuantity) || 0) : 0);
  const lateForCustomer = order.dateNeeded && expectedCompletion && expectedCompletion > order.dateNeeded;
  const quoteBlockedReason = !price
    ? 'Choose an item from the price list.'
    : !(Number(priceQuantity) > 0)
      ? 'Enter a quantity to price.'
      : !expectedCompletion
        ? 'Set an expected completion date.'
        : expectedCompletion < todayIso()
          ? 'The expected completion date cannot be in the past.'
          : materials.length === 0
          ? 'Add at least one estimated material.'
          : shortfall
            ? 'Not enough stock for every material — receive stock or ask the customer first.'
            : null;

  const updateLine = (index, patch) => setMaterials((lines) => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const choosePrice = (nextId) => {
    setPriceListItemId(nextId);
    const next = priceList.find((item) => item.id === nextId);
    if (next) setExpectedCompletion(addDays(todayIso(), next.leadDays));
  };

  const busy = sendQuote.isPending || requestDetails.isPending || sendBack.isPending || schedule.isPending;
  const actionError = sendQuote.error || requestDetails.error || sendBack.error || schedule.error;
  const ignore = () => {};

  return (
    <div className="tx-review">
      <section className="live-panel">
        <div className="live-panel-heading">
          <div><p className="eyebrow">{order.code} · <OrderStatus status={order.status} /></p><h2>{order.whatIsWanted}</h2></div>
          <Link to={`/textile/orders/${encodeURIComponent(order.id)}`}>Order page <ArrowUpRight size={14} /></Link>
        </div>
        <h3 className="tx-subhead">Order details</h3>
        <dl className="tx-facts">
          <div><dt>Customer</dt><dd>{order.customerName} · {order.customerType}</dd></div>
          <div><dt>What is wanted</dt><dd>{order.whatIsWanted}</dd></div>
          <div><dt>Quantity</dt><dd>{order.quantity}</dd></div>
          <div><dt>Size / design</dt><dd>{order.sizeDesign}</dd></div>
          <div><dt>Date needed</dt><dd>{formatDate(order.dateNeeded)}</dd></div>
          <div><dt>Reference photo</dt><dd>{order.photo?.name ?? 'None'}</dd></div>
        </dl>
        {order.status === 'AWAITING_DETAILS' && (
          <p className="tx-inline-note">Waiting for the customer: {order.history.at(-1)?.note}</p>
        )}

        <h3 className="tx-subhead">Estimated materials</h3>
        {materials.length === 0 && <p className="live-empty">No materials estimated yet.</p>}
        <ul className="tx-materials">
          {assessed.map((line, index) => (
            <li key={`${line.itemId}-${index}`} className={!line.sufficient ? 'short' : line.lowAfter ? 'low' : ''}>
              {editable ? (
                <div className="tx-material-edit">
                  <select aria-label="Material" value={line.itemId} onChange={(event) => updateLine(index, { itemId: event.target.value })}>
                    {stockItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <input
                    aria-label={`Quantity of ${line.item?.name ?? 'material'}`}
                    type="number" min="0.5" step="0.5" value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}
                  />
                  <button type="button" className="icon-button" aria-label={`Remove ${line.item?.name ?? 'material'}`} onClick={() => setMaterials((lines) => lines.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
                </div>
              ) : <b>{line.item?.name ?? line.itemId}</b>}
              <span>{line.quantity} {line.item?.unit ?? ''} — {describeMaterialLine(line)}</span>
            </li>
          ))}
        </ul>
        {editable && stockItems.length > 0 && (
          <button type="button" className="tx-link-button" onClick={() => setMaterials((lines) => [...lines, { itemId: stockItems[0].id, quantity: 1 }])}>
            <Plus size={13} />Add material
          </button>
        )}
      </section>

      <section className="tx-quote-card" aria-label="Quote">
        <p className="tx-quote-label">Quote</p>
        <strong className="tx-quote-amount">{formatUgx(amount)}</strong>
        {editable ? (
          <div className="tx-quote-fields">
            <label>From the Textile price list
              <select value={priceListItemId} onChange={(event) => choosePrice(event.target.value)}>
                <option value="" disabled>Choose a price-list item</option>
                {priceList.map((item) => <option key={item.id} value={item.id}>{item.label} — {formatUgx(item.unitPrice)} / {item.unit}</option>)}
              </select>
            </label>
            <div className="tx-quote-row">
              <label>Quantity{price ? ` (${price.unit}s)` : ''}
                <input type="number" min="1" step="1" value={priceQuantity} onChange={(event) => setPriceQuantity(Number(event.target.value))} />
              </label>
              <label>Expected completion
                <input type="date" min={todayIso()} value={expectedCompletion} onChange={(event) => setExpectedCompletion(event.target.value)} />
              </label>
            </div>
            {lateForCustomer && <p className="tx-quote-warn">Completes after the customer’s date needed ({formatDate(order.dateNeeded)}).</p>}
          </div>
        ) : order.quote && (
          <p className="tx-quote-meta">
            {priceList.find((item) => item.id === order.quote.priceListItemId)?.label ?? 'Textile price list'} × {order.quote.priceQuantity}
            {' '}· expected completion {formatDate(order.quote.expectedCompletion)} · sent by {order.quote.sentBy}
          </p>
        )}

        {order.status === 'QUOTED' && (
          <div className="tx-payment">
            <PaymentStatus status={order.payment.status} />
            <p>
              Finance confirms payment against reference <b>{order.code}</b>
              {order.payment.reference ? ` (payment ${order.payment.reference})` : ''}. The order reaches Scheduled only after that.
            </p>
          </div>
        )}

        <ErrorBanner error={actionError} fallback="That action could not be completed." />

        {editable && (
          <div className="tx-quote-actions">
            <button type="button" className="btn btn-primary" disabled={busy || Boolean(quoteBlockedReason)}
              onClick={() => sendQuote.mutateAsync({ materials, priceListItemId, priceQuantity: Number(priceQuantity), expectedCompletion }).catch(ignore)}>
              {sendQuote.isPending ? <LoaderCircle size={15} className="spin" /> : <Send size={14} />}Send quote
            </button>
            {quoteBlockedReason && <p className="tx-quote-reason">{quoteBlockedReason}</p>}
            <button type="button" className="btn tx-ghost" disabled={busy} onClick={() => { setPanel(panel === 'details' ? null : 'details'); setMessage(''); }}>
              <MessageSquareText size={14} />Ask customer for details
            </button>
            <button type="button" className="btn tx-ghost" disabled={busy} onClick={() => { setPanel(panel === 'back' ? null : 'back'); setMessage(''); }}>
              <Undo2 size={14} />Send back to reception
            </button>
            {panel && (
              <form className="tx-inline-form" onSubmit={(event) => {
                event.preventDefault();
                const action = panel === 'details' ? requestDetails : sendBack;
                action.mutateAsync(message.trim()).then(() => setPanel(null)).catch(ignore);
              }}>
                <label>{panel === 'details' ? 'What does the customer need to tell us?' : 'Why is this order going back to reception?'}
                  <textarea required rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
                </label>
                <button type="submit" className="btn btn-primary" disabled={busy || !message.trim()}>
                  {panel === 'details' ? 'Send request' : 'Send back'}
                </button>
              </form>
            )}
          </div>
        )}

        {order.status === 'QUOTED' && (
          <div className="tx-quote-actions">
            <button type="button" className="btn btn-primary" disabled={busy || !canScheduleOrder(order)}
              onClick={() => schedule.mutateAsync('SCHEDULED').catch(ignore)}>
              {schedule.isPending ? <LoaderCircle size={15} className="spin" /> : <CalendarCheck size={14} />}Move to Scheduled
            </button>
            {!canScheduleOrder(order) && <p className="tx-quote-reason">{SCHEDULE_BLOCKED_REASON}</p>}
          </div>
        )}
        {order.status === 'SCHEDULED' && <p className="tx-quote-meta">Payment confirmed — this order is now on the board as Scheduled.</p>}
      </section>
    </div>
  );
}
