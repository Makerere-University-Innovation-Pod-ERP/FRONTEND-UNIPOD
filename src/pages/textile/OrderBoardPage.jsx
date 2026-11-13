import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { collectionDeadline, groupOrdersByColumn, isOrderOverdue, todayIso } from '@/lib/textile';
import { formatDate } from '@/lib/presentation';
import { useTextileOrders } from '@/hooks/useTextile';
import { ErrorBanner, Loading, OrderStatus, PageHeading, PaymentStatus } from './shared';
import { useUnauthorizedRedirect } from './helpers';

export function OrderBoardPage({ token, onUnauthorized }) {
  const orders = useTextileOrders(token);
  useUnauthorizedRedirect(onUnauthorized, orders.error);
  const columns = groupOrdersByColumn(orders.data ?? []);
  const sentBack = (orders.data ?? []).filter((order) => order.status === 'RETURNED').length;

  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE" title="Order Board" intro="Every order in one view, from new request to collection.">
        <Link className="btn btn-primary" to="/textile/orders/new"><Plus size={15} />New order</Link>
      </PageHeading>
      <ErrorBanner error={orders.error} fallback="Could not load the order board." />
      {sentBack > 0 && <p className="tx-inline-note">{sentBack} order{sentBack === 1 ? ' was' : 's were'} sent back to reception and {sentBack === 1 ? 'is' : 'are'} not shown.</p>}
      {orders.isLoading ? <Loading label="Loading orders…" /> : (
        <div className="tx-board">
          {columns.map((column) => (
            <section key={column.id} className="tx-column" aria-labelledby={`col-${column.id}`}>
              <h2 id={`col-${column.id}`}>{column.label} <span>{column.orders.length}</span></h2>
              {column.orders.length === 0 && <p className="tx-column-empty">Nothing here.</p>}
              {column.orders.map((order) => (
                <Link
                  key={order.id}
                  className="tx-card"
                  to={column.id === 'new' ? `/textile/review?order=${encodeURIComponent(order.id)}` : `/textile/orders/${encodeURIComponent(order.id)}`}
                >
                  <b>{order.whatIsWanted}</b>
                  <small className="tx-mono">{order.code}</small>
                  <small>{order.customerName} · {order.customerType}</small>
                  {column.id === 'new' && order.status !== 'NEW' && (
                    <span className="tx-card-tags">
                      {order.status === 'QUOTED' ? <PaymentStatus status={order.payment.status} /> : <OrderStatus status={order.status} />}
                    </span>
                  )}
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
