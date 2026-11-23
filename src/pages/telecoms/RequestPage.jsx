import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, LoaderCircle, Save } from 'lucide-react';
import { formatUgx, nextRequestStep } from '@/lib/telecoms';
import { formatDate } from '@/lib/presentation';
import {
  useMarkTelecomsDone,
  useTelecomsRequest,
  useTelecomsRequests,
  useUpdateTelecomsStatus,
  useUpdateTelecomsWorkDetails,
} from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading, PaymentStatus, RequestStatus } from './shared';
import { formatDateTime, useUnauthorizedRedirect } from './helpers';

export function RequestsIndexPage({ token, onUnauthorized }) {
  const requestsQuery = useTelecomsRequests(token);
  const [filter, setFilter] = useState('');
  useUnauthorizedRedirect(onUnauthorized, requestsQuery.error);

  const items = (requestsQuery.data ?? []).filter((req) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      req.code?.toLowerCase().includes(term) ||
      req.customerName.toLowerCase().includes(term) ||
      req.serviceWanted.toLowerCase().includes(term) ||
      req.status.toLowerCase().includes(term)
    );
  });

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · DIRECTORY"
        title="Telecoms Requests"
        intro="Browse and inspect all service requests, diagnostics and testing cases."
      >
        <Link className="btn btn-primary" to="/telecoms/board">View Request Board</Link>
      </PageHeading>

      <ErrorBanner error={requestsQuery.error} fallback="Could not load requests." />

      <div className="tx-table-panel">
        <div className="form-field" style={{ maxWidth: 360, marginBottom: 12 }}>
          <input
            type="search"
            placeholder="Search by code, customer, service, status…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {requestsQuery.isLoading ? (
          <Loading label="Loading requests…" />
        ) : (
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Service Wanted</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Preferred Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="live-empty">No requests found.</td>
                  </tr>
                ) : (
                  items.map((req) => (
                    <tr key={req.id}>
                      <td className="tx-mono"><b>{req.code}</b></td>
                      <td>{req.customerName} <small>({req.customerType})</small></td>
                      <td>{req.serviceWanted}</td>
                      <td><RequestStatus status={req.status} /></td>
                      <td><PaymentStatus status={req.payment.status} /></td>
                      <td>{formatDate(req.preferredDate)}</td>
                      <td>
                        <Link className="btn btn-sm" to={`/telecoms/requests/${req.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function RequestPage({ token, onUnauthorized }) {
  const { id } = useParams();
  const requestQuery = useTelecomsRequest(token, id ?? '');
  useUnauthorizedRedirect(onUnauthorized, requestQuery.error);

  if (requestQuery.isLoading) return <Loading label="Loading request file…" />;
  if (!requestQuery.data) {
    return (
      <div className="live-page page-enter">
        <PageHeading eyebrow="TELECOMS" title="Request Not Found" />
        <Link className="btn" to="/telecoms/board"><ArrowLeft size={15} />Back to Board</Link>
      </div>
    );
  }

  return <RequestDetailView token={token} request={requestQuery.data} onUnauthorized={onUnauthorized} />;
}

function RequestDetailView({ token, request, onUnauthorized }) {
  const [workDetails, setWorkDetails] = useState({
    technician: request.workDetails?.technician || 'Eng. Kaddu',
    partsUsed: request.workDetails?.partsUsed || '',
    timeSpent: request.workDetails?.timeSpent || '',
    notes: request.workDetails?.notes || '',
  });
  const [saveNotice, setSaveNotice] = useState('');

  const updateWorkMutation = useUpdateTelecomsWorkDetails(token, request.id);
  const updateStatusMutation = useUpdateTelecomsStatus(token, request.id);
  const markDoneMutation = useMarkTelecomsDone(token, request.id);
  useUnauthorizedRedirect(
    onUnauthorized,
    updateWorkMutation.error,
    updateStatusMutation.error,
    markDoneMutation.error,
  );

  const step = nextRequestStep(request);

  const onSaveWork = async (e) => {
    e.preventDefault();
    setSaveNotice('');
    try {
      await updateWorkMutation.mutateAsync(workDetails);
      setSaveNotice('Work details saved.');
    } catch {
      // Handled by error banner
    }
  };

  const onAdvanceStep = async () => {
    if (!step || step.blockedReason) return;
    if (step.toStatus === 'DONE') {
      await markDoneMutation.mutateAsync();
    } else {
      await updateStatusMutation.mutateAsync(step.toStatus);
    }
  };

  return (
    <div className="live-page page-enter">
      <div className="tx-week-head">
        <div>
          <Link className="btn btn-sm" to="/telecoms/board" style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} />Back to Board
          </Link>
          <PageHeading
            eyebrow={`TELECOMS · ${request.code}`}
            title={request.serviceWanted}
            intro={`Customer: ${request.customerName} (${request.customerType}) · Submitted: ${formatDate(request.createdAt)}`}
          />
        </div>
        <div className="tx-row-status">
          <RequestStatus status={request.status} />
          <PaymentStatus status={request.payment.status} />
        </div>
      </div>

      <ErrorBanner
        error={updateWorkMutation.error || updateStatusMutation.error || markDoneMutation.error}
        fallback="Could not update request."
      />

      {saveNotice && <p className="tx-success">{saveNotice}</p>}

      <div className="tx-review">
        {/* Left side: Technical record */}
        <div className="tx-stack">
          <section className="live-panel">
            <h3 className="tx-panel-title">Diagnostic & Testing Record (TL4)</h3>
            <form className="tx-form" onSubmit={onSaveWork}>
              <div className="form-field">
                <label htmlFor="tl-technician">Assigned Technician</label>
                <input
                  id="tl-technician"
                  type="text"
                  value={workDetails.technician}
                  onChange={(e) => setWorkDetails((prev) => ({ ...prev, technician: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label htmlFor="tl-parts-used">Parts / Supplies Used from Stock</label>
                <input
                  id="tl-parts-used"
                  type="text"
                  placeholder="e.g. 2x SMA Connectors, 50cm RG58 cable, solder flux"
                  value={workDetails.partsUsed}
                  onChange={(e) => setWorkDetails((prev) => ({ ...prev, partsUsed: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label htmlFor="tl-time-spent">Bench / Testing Time Spent</label>
                <input
                  id="tl-time-spent"
                  type="text"
                  placeholder="e.g. 3 hours (Spectrum Analyzer + Soldering Bay)"
                  value={workDetails.timeSpent}
                  onChange={(e) => setWorkDetails((prev) => ({ ...prev, timeSpent: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label htmlFor="tl-tech-notes">Technician Observations, Test Results & Measurements</label>
                <textarea
                  id="tl-tech-notes"
                  rows={4}
                  placeholder="Record carrier frequency, power levels, SWR, spurious harmonics, certification notes…"
                  value={workDetails.notes}
                  onChange={(e) => setWorkDetails((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="tx-actions">
                <button className="btn btn-primary" type="submit" disabled={updateWorkMutation.isPending}>
                  {updateWorkMutation.isPending ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}
                  Save work details
                </button>
              </div>
            </form>
          </section>

          {/* Audit History */}
          <section className="live-panel telecoms-history-panel" style={{ marginTop: '20px' }}>
            <h3 className="tx-panel-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Activity & State History
            </h3>
            <div className="telecoms-history-list" style={{ display: 'grid', gap: '12px' }}>
              {request.history.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '14px 16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#176b52',
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#176b52', background: '#e4efe6', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                          {entry.status}
                        </span>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                          by <strong style={{ color: '#0f172a' }}>{entry.by}</strong>
                        </span>
                      </div>
                      <time style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                        <Clock size={13} style={{ color: '#176b52' }} />
                        {formatDateTime(entry.at)}
                      </time>
                    </div>
                    {entry.note && (
                      <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.55 }}>
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right side: Summary & Status progression */}
        <div className="tx-stack">
          <section className="live-panel">
            <h3 className="tx-panel-title">Request Overview</h3>
            <dl className="tx-facts single">
              <div>
                <dt>Equipment Involved</dt>
                <dd>{request.equipmentInvolved || 'None stated'}</dd>
              </div>
              <div>
                <dt>Preferred Date</dt>
                <dd>{formatDate(request.preferredDate)}</dd>
              </div>
              <div>
                <dt>Quote Amount</dt>
                <dd>{request.quote ? formatUgx(request.quote.amount) : 'Not quoted'}</dd>
              </div>
              <div>
                <dt>Payment Reference</dt>
                <dd>{request.payment.reference || 'Pending verification'}</dd>
              </div>
            </dl>
          </section>

          {/* Transition Control */}
          <section className="live-panel">
            <h3 className="tx-panel-title">Workflow Progression</h3>
            {step ? (
              <div className="tx-stack">
                <p className="tx-inline-note">
                  Current state is <b>{request.status}</b>. Next operational stage is <b>{step.toStatus}</b>.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={Boolean(step.blockedReason) || updateStatusMutation.isPending || markDoneMutation.isPending}
                  onClick={onAdvanceStep}
                >
                  <CheckCircle2 size={15} />
                  {step.label}
                </button>
                {step.blockedReason && (
                  <p className="tx-field-error" role="alert">{step.blockedReason}</p>
                )}
              </div>
            ) : (
              <p className="tx-success">
                This request has reached its final state ({request.status}).
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
