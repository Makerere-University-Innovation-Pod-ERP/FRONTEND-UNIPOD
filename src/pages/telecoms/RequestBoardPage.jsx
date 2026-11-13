import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { groupRequestsByColumn } from '@/lib/telecoms';
import { useTelecomsRequests } from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading, PaymentStatus, RequestStatus } from './shared';
import { useUnauthorizedRedirect } from './helpers';

export function RequestBoardPage({ token, onUnauthorized }) {
  const requestsQuery = useTelecomsRequests(token);
  useUnauthorizedRedirect(onUnauthorized, requestsQuery.error);

  const columns = groupRequestsByColumn(requestsQuery.data ?? []);
  const sentBack = (requestsQuery.data ?? []).filter((req) => req.status === 'RETURNED').length;

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · WORKFLOW 6.1"
        title="Telecoms Request Board"
        intro="Live operational board tracking diagnostic, calibration and testing requests from intake to delivery."
      >
        <Link className="btn btn-primary" to="/telecoms/requests/new">
          <Plus size={15} />New request
        </Link>
      </PageHeading>

      <ErrorBanner error={requestsQuery.error} fallback="Could not load telecoms board." />

      {sentBack > 0 && (
        <p className="tx-inline-note">
          {sentBack} request{sentBack === 1 ? ' was' : 's were'} sent back to reception and {sentBack === 1 ? 'is' : 'are'} not shown.
        </p>
      )}

      {requestsQuery.isLoading ? (
        <Loading label="Loading board…" />
      ) : (
        <div className="tx-board">
          {columns.map((column) => (
            <section key={column.id} className="tx-column" aria-labelledby={`col-${column.id}`}>
              <h2 id={`col-${column.id}`}>
                {column.label} <span>{column.requests.length}</span>
              </h2>
              {column.requests.length === 0 && <p className="tx-column-empty">Nothing in this column.</p>}
              {column.requests.map((req) => (
                <Link
                  key={req.id}
                  className="tx-card"
                  to={
                    column.id === 'new'
                      ? `/telecoms/review?request=${encodeURIComponent(req.id)}`
                      : `/telecoms/requests/${encodeURIComponent(req.id)}`
                  }
                >
                  <b>{req.serviceWanted}</b>
                  <small className="tx-mono">{req.code}</small>
                  <small>{req.customerName} · {req.customerType}</small>
                  {req.equipmentInvolved && <small className="tx-muted">Eq: {req.equipmentInvolved}</small>}
                  <div className="tx-card-tags">
                    {column.id === 'new' && req.status === 'QUOTED' ? (
                      <PaymentStatus status={req.payment.status} />
                    ) : (
                      <RequestStatus status={req.status} />
                    )}
                  </div>
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
