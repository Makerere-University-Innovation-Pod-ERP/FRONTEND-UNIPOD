import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CircleAlert, ClipboardList, LoaderCircle } from 'lucide-react';
import { useFactFindingQueue } from '@/hooks/useFactFinding';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';

export function FactFindingOverview({ token, onUnauthorized }) {
  const { data: queue, isLoading, error } = useFactFindingQueue(token);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  const received = queue?.filter((item) => item.stage === 'RECEIVED').length ?? 0;
  const inFactFinding = queue?.filter((item) => item.stage === 'FACT_FINDING').length ?? 0;

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">FACT-FINDING OFFICER · OVERVIEW</p><h1>Fact-finding queue.</h1><p>Completeness and relevance assessments waiting on your review.</p></div>
        <div className="heading-actions"><Link className="btn btn-primary" to="/fact-finding/queue"><ClipboardList size={16} />Open fact-finding<ArrowRight size={15} /></Link></div>
      </div>
      {error && !(error instanceof ApiError && error.status === 401) && (
        <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error instanceof Error ? error.message : 'Could not load the fact-finding queue.'}</div>
      )}
      {isLoading ? (
        <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading fact-finding queue…</div>
      ) : (
        <>
          <section className="live-metrics" aria-label="Fact-finding summary">
            <Metric label="In queue" value={queue?.length ?? 0} note="Cases awaiting assessment" />
            <Metric label="Newly received" value={received} note="Fact-finding not yet started" />
            <Metric label="In fact-finding" value={inFactFinding} note="Checklist in progress" />
          </section>
          <section className="live-panel live-recent">
            <div className="live-panel-heading"><div><p className="eyebrow">PRIORITY QUEUE</p><h2>Needs attention</h2></div><Link to="/fact-finding/queue">Open workspace <ArrowUpRight size={14} /></Link></div>
            {queue?.length ? (
              <div className="attention-list">{queue.map((item) => (
                <Link className="attention-row" to={`/fact-finding/cases/${item.id}`} key={item.id}>
                  <span className="attention-icon"><CircleAlert size={16} /></span>
                  <span className="attention-copy"><b>{item.title}</b><small>{item.code || 'Uncoded'} · {formatStage(item.stage)} · {item.reason}</small></span>
                  <ArrowRight size={15} />
                </Link>
              ))}</div>
            ) : <p className="live-empty">Nothing is waiting for fact-finding right now.</p>}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, note }) {
  return <article className="live-metric"><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}
