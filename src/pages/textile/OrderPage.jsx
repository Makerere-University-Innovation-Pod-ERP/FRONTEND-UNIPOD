import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Boxes, LoaderCircle, PackageCheck, Save } from 'lucide-react';
import { ORDER_STATUS_LABELS, formatUgx, isChecklistComplete, isMachineBookable, nextOrderStep } from '@/lib/textile';
import { formatDate } from '@/lib/presentation';
import {
  useMachines, useOrderTransition, useRecordCollection, useSaveProduction, useSaveQuality, useTextileOrder, useTextileOrders,
} from '@/hooks/useTextile';
import { ErrorBanner, Loading, OrderStatus, PageHeading, PaymentStatus } from './shared';
import { formatDateTime, useUnauthorizedRedirect } from './helpers';

const PRODUCTION_STATUSES = ['SCHEDULED', 'BEING_MADE', 'READY', 'COLLECTED'];
const ignore = () => {};

export function OrderPage({ token, onUnauthorized }) {
  const { id = '' } = useParams();
  const order = useTextileOrder(token, id);
  const machines = useMachines(token);
  useUnauthorizedRedirect(onUnauthorized, order.error, machines.error);

  if (order.isLoading) return <Loading label="Loading order…" />;
  if (!order.data) {
    return (
      <div className="live-page">
        <Link to="/textile/board" className="back-link"><ArrowLeft size={15} />Order board</Link>
        <ErrorBanner error={order.error} fallback="This order could not be loaded." />
      </div>
    );
  }
  return <OrderView key={order.data.id} token={token} order={order.data} machines={machines.data ?? []} onUnauthorized={onUnauthorized} />;
}

function OrderView({ token, order, machines, onUnauthorized }) {
  const transition = useOrderTransition(token, order.id);
  useUnauthorizedRedirect(onUnauthorized, transition.error);
  const step = nextOrderStep(order);
  const inProduction = PRODUCTION_STATUSES.includes(order.status);

  return (
    <div className="live-page page-enter">
      <Link to="/textile/board" className="back-link"><ArrowLeft size={15} />Order board</Link>
      <div className="tx-order-meta"><OrderStatus status={order.status} /><span className="tx-mono">{order.code ?? 'Draft'}</span></div>
      <PageHeading eyebrow={`${order.customerName} · ${order.customerType}`} title={order.whatIsWanted}>
        {step && order.status !== 'BEING_MADE' && (
          <button type="button" className="btn btn-primary" disabled={Boolean(step.blockedReason) || transition.isPending}
            title={step.blockedReason ?? undefined}
            onClick={() => transition.mutateAsync(step.toStatus).catch(ignore)}>
            {transition.isPending ? <LoaderCircle size={15} className="spin" /> : <ArrowRight size={15} />}{step.label}
          </button>
        )}
      </PageHeading>
      {step?.blockedReason && order.status === 'QUOTED' && <p className="tx-inline-note">{step.blockedReason}</p>}
      {['NEW', 'AWAITING_DETAILS', 'QUOTED'].includes(order.status) && (
        <p className="tx-inline-note">This order is still being reviewed. <Link to={`/textile/review?order=${encodeURIComponent(order.id)}`}>Open Order Review & Quote</Link></p>
      )}
      {order.status === 'DRAFT' && (
        <p className="tx-inline-note">This order is a draft. <Link to={`/textile/orders/new?draft=${encodeURIComponent(order.id)}`}>Continue editing</Link></p>
      )}
      <ErrorBanner error={transition.error} fallback="The order could not be moved." />

      <div className="detail-grid">
        <div className="tx-stack">
          {/* Always visible: the maker needs the size/design and date while producing. */}
          <OrderSummary order={order} />
          {inProduction && <ProductionPanel key={JSON.stringify(order.production)} token={token} order={order} machines={machines} onUnauthorized={onUnauthorized} />}
          {inProduction && <QualityPanel token={token} order={order} onUnauthorized={onUnauthorized} />}
        </div>
        <div className="tx-stack">
          {inProduction && <CollectionPanel key={order.status} token={token} order={order} step={step} transition={transition} onUnauthorized={onUnauthorized} />}
          <section className="live-panel">
            <h2 className="tx-panel-title">Quote & payment</h2>
            {order.quote ? (
              <dl className="tx-facts single">
                <div><dt>Quote</dt><dd>{formatUgx(order.quote.amount)} · expected {formatDate(order.quote.expectedCompletion)}</dd></div>
                <div><dt>Payment</dt><dd><PaymentStatus status={order.payment.status} />{order.payment.reference ? ` ${order.payment.reference}` : ''}</dd></div>
              </dl>
            ) : <p className="live-empty">No quote sent yet.</p>}
          </section>
          <section className="live-panel">
            <h2 className="tx-panel-title">History</h2>
            <ol className="history-list">
              {[...order.history].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`}>
                  <b>{ORDER_STATUS_LABELS[entry.status] ?? entry.status}</b>
                  <small>{entry.by} · {formatDateTime(entry.at)}</small>
                  {entry.note && <p>{entry.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function OrderSummary({ order }) {
  return (
    <section className="live-panel">
      <h2 className="tx-panel-title">Order details</h2>
      <dl className="tx-facts">
        <div><dt>Quantity</dt><dd>{order.quantity}</dd></div>
        <div><dt>Size / design</dt><dd>{order.sizeDesign}</dd></div>
        <div><dt>Date needed</dt><dd>{formatDate(order.dateNeeded)}</dd></div>
        <div><dt>Reference photo</dt><dd>{order.photo?.name ?? 'None'}</dd></div>
      </dl>
    </section>
  );
}

function ProductionPanel({ token, order, machines, onUnauthorized }) {
  const [values, setValues] = useState(order.production);
  const save = useSaveProduction(token, order.id);
  useUnauthorizedRedirect(onUnauthorized, save.error);
  const locked = order.status === 'COLLECTED';
  const dirty = JSON.stringify(values) !== JSON.stringify(order.production);
  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <h2 className="tx-panel-title">Materials, machine & staff used</h2>
        {!locked && <Link to={`/textile/stock/movements?type=USED_ON_ORDER&order=${encodeURIComponent(order.id)}`}><Boxes size={13} />Record stock used</Link>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); save.mutateAsync({ ...values, machineId: values.machineId || null }).catch(ignore); }}>
        <div className="form-grid">
          <label className="form-field">Material used
            <input disabled={locked} value={values.materialUsed} onChange={set('materialUsed')} placeholder="e.g. 18 metres canvas, 50 woven labels" />
          </label>
          <label className="form-field">Machine used
            <select disabled={locked} value={values.machineId ?? ''} onChange={set('machineId')}>
              <option value="">No machine</option>
              {machines.map((machine) => {
                const usable = isMachineBookable(machine) || machine.id === order.production.machineId;
                return <option key={machine.id} value={machine.id} disabled={!usable}>{machine.name}{usable ? '' : ' — not available'}</option>;
              })}
            </select>
          </label>
          <label className="form-field">Staff on job
            <input disabled={locked} value={values.staff} onChange={set('staff')} placeholder="Who is making it?" />
          </label>
          <label className="form-field">Notes
            <input disabled={locked} value={values.notes} onChange={set('notes')} />
          </label>
        </div>
        <ErrorBanner error={save.error} fallback="Could not save production details." />
        {!locked && (
          <div className="tx-actions">
            <button type="submit" className="btn" disabled={!dirty || save.isPending}>
              {save.isPending ? <LoaderCircle size={14} className="spin" /> : <Save size={14} />}Save details
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

function QualityPanel({ token, order, onUnauthorized }) {
  const save = useSaveQuality(token, order.id);
  useUnauthorizedRedirect(onUnauthorized, save.error);
  const editable = order.status === 'BEING_MADE';

  const toggle = (id, checked) => {
    const checklist = order.qualityChecklist.map((item) => (item.id === id ? { ...item, checked } : item));
    save.mutateAsync(checklist).catch(ignore);
  };

  return (
    <section className="live-panel">
      <h2 className="tx-panel-title">Quality checklist</h2>
      {!editable && order.status === 'SCHEDULED' && <p className="tx-inline-note">The checklist opens once making starts.</p>}
      <ul className="tx-checklist">
        {order.qualityChecklist.map((item) => (
          <li key={item.id}>
            <label className="tx-check">
              <input type="checkbox" checked={item.checked} disabled={!editable || save.isPending} onChange={(event) => toggle(item.id, event.target.checked)} />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <ErrorBanner error={save.error} fallback="Could not update the checklist." />
    </section>
  );
}

function CollectionPanel({ token, order, step, transition, onUnauthorized }) {
  const [collectedBy, setCollectedBy] = useState(order.customerName);
  const record = useRecordCollection(token, order.id);
  useUnauthorizedRedirect(onUnauthorized, record.error);

  return (
    <section className="live-panel">
      <h2 className="tx-panel-title">Collection</h2>
      {order.collection ? (
        <dl className="tx-facts single">
          <div><dt>Collected by</dt><dd>{order.collection.collectedBy}</dd></div>
          <div><dt>When</dt><dd>{formatDateTime(order.collection.collectedAt)}</dd></div>
          <div><dt>Recorded by</dt><dd>{order.collection.recordedBy}</dd></div>
        </dl>
      ) : (
        <>
          <p className="live-empty">Not yet collected.</p>
          {order.status === 'BEING_MADE' && step && (
            <>
              <button type="button" className="btn btn-primary tx-block" disabled={Boolean(step.blockedReason) || transition.isPending}
                onClick={() => transition.mutateAsync(step.toStatus).catch(ignore)}>
                {transition.isPending ? <LoaderCircle size={15} className="spin" /> : <PackageCheck size={15} />}Mark ready
              </button>
              {step.blockedReason && <p className="tx-quote-reason dark">{step.blockedReason}</p>}
            </>
          )}
          {order.status === 'READY' && (
            <form className="tx-collection-form" onSubmit={(event) => { event.preventDefault(); record.mutateAsync(collectedBy.trim()).catch(ignore); }}>
              <label className="form-field">Collected by
                <input required value={collectedBy} onChange={(event) => setCollectedBy(event.target.value)} placeholder="Name of the person collecting" />
              </label>
              <button type="submit" className="btn btn-primary tx-block" disabled={!collectedBy.trim() || record.isPending || !isChecklistComplete(order.qualityChecklist)}>
                {record.isPending ? <LoaderCircle size={15} className="spin" /> : <PackageCheck size={15} />}Record collection
              </button>
              <p className="tx-quote-reason dark">The date and time and your name are recorded automatically.</p>
            </form>
          )}
          {order.status === 'SCHEDULED' && <p className="tx-quote-reason dark">Start making the order before it can be marked ready.</p>}
        </>
      )}
      <ErrorBanner error={record.error} fallback="Could not record the collection." />
    </section>
  );
}

/** Index for the "Order page" nav entry: every order, newest first, linking to its page. */
export function OrdersIndexPage({ token, onUnauthorized }) {
  const orders = useTextileOrders(token);
  useUnauthorizedRedirect(onUnauthorized, orders.error);
  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE · ORDERS" title="Order pages" intro="Open an order to record materials, machine, staff, quality checks and collection." />
      <ErrorBanner error={orders.error} fallback="Could not load orders." />
      {orders.isLoading ? <Loading label="Loading orders…" /> : (
        <section className="live-panel">
          <div className="live-table-wrap">
            <table className="live-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Date needed</th><th>Updated</th></tr></thead>
              <tbody>
                {[...(orders.data ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((order) => (
                  <tr key={order.id}>
                    <td><Link className="case-title" to={`/textile/orders/${encodeURIComponent(order.id)}`}><b>{order.whatIsWanted || 'Untitled order'}</b><small>{order.code ?? 'Draft'}</small></Link></td>
                    <td>{order.customerName} · {order.customerType}</td>
                    <td><OrderStatus status={order.status} /></td>
                    <td>{formatDate(order.dateNeeded)}</td>
                    <td>{formatDate(order.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
