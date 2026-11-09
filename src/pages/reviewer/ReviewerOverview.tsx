import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CircleAlert, LoaderCircle, Users } from 'lucide-react';
import { useReviewerAssigned } from '@/hooks/useReviewer';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';

export function ReviewerOverview({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const { data: assigned, isLoading, error } = useReviewerAssigned(token);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  const pending = assigned?.filter((item) => item.decisionStatus === 'pending').length ?? 0;
  const changesNeeded = assigned?.filter((item) => item.decisionStatus === 'changes_needed').length ?? 0;

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">REVIEWER · OVERVIEW</p><h1>Your assigned cases.</h1><p>Only cases assigned to you appear here.</p></div>
        <div className="heading-actions"><Link className="btn btn-primary" to="/reviewer/workspace"><Users size={16} />Open review workspace<ArrowRight size={15} /></Link></div>
      </div>
      {error && !(error instanceof ApiError && error.status === 401) && (
        <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error instanceof Error ? error.message : 'Could not load your assigned cases.'}</div>
      )}
      {isLoading ? (
        <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading your assigned cases…</div>
      ) : (
        <>
          <section className="live-metrics" aria-label="Reviewer summary">
            <Metric label="Assigned cases" value={assigned?.length ?? 0} note="Currently assigned to you" />
            <Metric label="Awaiting your decision" value={pending} note="Independent decision not yet recorded" />
            <Metric label="Changes requested" value={changesNeeded} note="Waiting on resubmission" />
          </section>
          <section className="live-panel live-recent">
            <div className="live-panel-heading"><div><p className="eyebrow">PENDING ACTIONS</p><h2>Needs your attention</h2></div><Link to="/reviewer/workspace">Open workspace <ArrowUpRight size={14} /></Link></div>
            {assigned?.length ? (
              <div className="attention-list">{assigned.map((item) => (
                <Link className="attention-row" to="/reviewer/workspace" key={item.id}>
                  <span className="attention-icon"><CircleAlert size={16} /></span>
                  <span className="attention-copy"><b>{item.title}</b><small>{item.code || 'Uncoded'} · {formatStage(item.stage)} · {item.pendingAction}</small></span>
                  <ArrowRight size={15} />
                </Link>
              ))}</div>
            ) : <p className="live-empty">No cases are currently assigned to you.</p>}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <article className="live-metric"><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}
