import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  collectionDeadline, groupOrdersByColumn, isOrderOverdue, isReadyToSchedule, matchesOrderSearch, summarizeBoard, todayIso,
} from '@/lib/textile';
import { formatDate } from '@/lib/presentation';
import { useTextileOrders } from '@/hooks/useTextile';
import { ErrorBanner, Loading, OrderStatus, PageHeading, PaymentStatus, StatusDot } from './shared';
import { useUnauthorizedRedirect } from './helpers';

/** Overdue flag for unfinished work, and the collection countdown for Ready orders. */
function DeadlineTags({ order, today }) {
  const collection = collectionDeadline(order, today);
  if (isOrderOverdue(order, today)) return <span className="tx-card-tags"><StatusDot tone="danger">Overdue</StatusDot></span>;
  if (collection?.warn) {
    return (
      <span className="tx-card-tags">
        <StatusDot tone={collection.daysLeft < 0 ? 'danger' : 'attention'}>
          {collection.daysLeft < 0 ? 'Collection limit passed' : `Collect by ${formatDate(collection.deadline)}`}
        </StatusDot>
      </span>
    );
  }
  return null;
}

/** Status tag for cards in the New column, where several review statuses share one column. */
function ReviewTag({ order }) {
  if (order.status === 'NEW') return null;
  if (isReadyToSchedule(order)) return <span className="tx-card-tags"><StatusDot tone="positive">Paid · ready to schedule</StatusDot></span>;
  return (
    <span className="tx-card-tags">
      {order.status === 'QUOTED' ? <PaymentStatus status={order.payment.status} /> : <OrderStatus status={order.status} />}
    </span>
  );
}

/** Quick filters for the orders that need attention; each matches one summary count. */
const ATTENTION_FILTERS = [
  { id: 'overdue', label: 'Overdue', count: (summary) => summary.overdue, test: (order, today) => isOrderOverdue(order, today) },
  { id: 'collectSoon', label: 'Collection due', count: (summary) => summary.collectSoon, test: (order, today) => Boolean(collectionDeadline(order, today)?.warn) },
  { id: 'readyToSchedule', label: 'Ready to schedule', count: (summary) => summary.readyToSchedule, test: (order) => isReadyToSchedule(order) },
];

export function OrderBoardPage({ token, onUnauthorized }) {
  const orders = useTextileOrders(token);
  useUnauthorizedRedirect(onUnauthorized, orders.error);
  const [query, setQuery] = useState('');
  const [attention, setAttention] = useState(null);
  const today = todayIso();
  const all = orders.data ?? [];
  const summary = summarizeBoard(all, today);
  const activeFilter = ATTENTION_FILTERS.find((filter) => filter.id === attention);
  const visible = all.filter((order) => matchesOrderSearch(order, query) && (!activeFilter || activeFilter.test(order, today)));
  const filtering = Boolean(query.trim() || activeFilter);
  const columns = groupOrdersByColumn(visible);
  const sentBack = all.filter((order) => order.status === 'RETURNED').length;

  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE" title="Order Board" intro="Every order in one view, from new request to collection.">
        <Link className="btn btn-primary" to="/textile/orders/new"><Plus size={15} />New order</Link>
      </PageHeading>
      <ErrorBanner error={orders.error} fallback="Could not load the order board." />
      {sentBack > 0 && <p className="tx-inline-note">{sentBack} order{sentBack === 1 ? ' was' : 's were'} sent back to reception and {sentBack === 1 ? 'is' : 'are'} not shown.</p>}
      {orders.isLoading ? <Loading label="Loading orders…" variant="board" columns={columns.length} /> : (
        <>
          <div className="tx-filters">
            <input
              type="search"
              aria-label="Search orders"
              placeholder="Search by customer, order code or item"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ul className="tx-board-summary" aria-label="Orders needing attention">
            {ATTENTION_FILTERS.map((filter) => (
              <li key={filter.id}>
                <button
                  type="button"
                  aria-pressed={attention === filter.id}
                  onClick={() => setAttention((current) => (current === filter.id ? null : filter.id))}
                >
                  {filter.label} <b>{filter.count(summary)}</b>
                </button>
              </li>
            ))}
          </ul>
          {filtering && (
            <p className="tx-inline-note" role="status">
              Showing {visible.length} of {all.length - sentBack} order{all.length - sentBack === 1 ? '' : 's'}.{' '}
              <button type="button" className="tx-link-button" onClick={() => { setQuery(''); setAttention(null); }}>Clear filters</button>
            </p>
          )}
          <div className="tx-board">
            {columns.map((column) => (
              <section key={column.id} className="tx-column" aria-labelledby={`col-${column.id}`}>
                <h2 id={`col-${column.id}`}>{column.label} <span>{column.orders.length}</span></h2>
                {column.orders.length === 0 && <p className="tx-column-empty">{filtering ? 'No matching orders.' : 'Nothing here.'}</p>}
                {column.orders.map((order) => (
                  <Link
                    key={order.id}
                    className="tx-card"
                    to={column.id === 'new' ? `/textile/review?order=${encodeURIComponent(order.id)}` : `/textile/orders/${encodeURIComponent(order.id)}`}
                  >
                    <b>{order.whatIsWanted}</b>
                    <small className="tx-mono">{order.code}</small>
                    <small>{order.customerName} · {order.customerType}</small>
                    {order.dateNeeded && <small>Needed {formatDate(order.dateNeeded)}</small>}
                    <DeadlineTags order={order} today={today} />
                    {column.id === 'new' && <ReviewTag order={order} />}
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
