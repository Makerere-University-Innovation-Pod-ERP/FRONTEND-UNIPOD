import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleAlert, LoaderCircle, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubmissionRows } from '@/components/SubmissionRows';
import { ApiError, backendApi } from '@/services/backend-api';
import { SUBMISSION_INTAKE_ROLES } from '@/lib/auth';
import { formatStage } from '@/lib/presentation';

const PIPELINE_STAGES = [
  'UNDER_REVIEW',
  'FACT_FINDING',
  'REFINEMENT_REQUESTED',
  'FORWARDED',
  'COMPLETED',
  'RECEIVED',
];

export function LiveDashboard({
  token,
  roles,
  onUnauthorized,
}) {
  const [overview, setOverview] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pipelineAtAGlance = overview?.pipelineAtAGlance ?? overview?.byStage ?? {};

  const load = useCallback(async (signal) => {
    try {
      const [data, submissions] = await Promise.all([
        backendApi.dashboard(token, signal),
        backendApi.submissions(token, { size: 6 }, signal),
      ]);
      setOverview(data);
      setRecent(submissions.items);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Could not load the dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">MUTIC ERP · OVERVIEW</p><h1>Good work starts here.</h1><p>Your role-scoped view of submissions, workflow and cases needing attention.</p></div>
        <div className="heading-actions">
          <button className="btn btn-outline" onClick={() => { setLoading(true); setError(''); void load(); }} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>
          {roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) && <Link className="btn btn-primary" to="/submissions/new"><Plus size={16} />New submission</Link>}
        </div>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      {loading && !overview ? (
        <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading live dashboard…</div>
      ) : overview ? (
        <>
          <section className="live-metrics" aria-label="Submission summary">
            <Metric label="Total submissions" value={overview.totalSubmissions} note={`${overview.studentSubmissions} student · ${overview.generalSubmissions} general`} />
            <Metric label="Awaiting action" value={overview.awaitingActionCount} note="Cases in active queues" />
            <Metric label="Forwarded" value={overview.forwardedCount} note={`${overview.awaitingReviewCount} awaiting review`} />
            <Metric label="Completed" value={overview.completedCount} note={`${overview.recentlyUpdatedCount} recently updated`} />
          </section>
          <div className="live-dashboard-grid">
            <section className="live-panel live-attention">
              <div className="live-panel-heading"><div><p className="eyebrow">PRIORITY QUEUE</p><h2>Needs attention</h2></div><Link to="/submissions">All cases <ArrowUpRight size={14} /></Link></div>
              {overview.needsAttention.length ? (
                <div className="attention-list">{overview.needsAttention.slice(0, 4).map((item, index) => (
                  <Link className="attention-row" to={`/submissions/${item.id}`} key={item.id}>
                    <span className="attention-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="attention-copy"><b>{item.title}</b><small>{item.code || 'Uncoded'} · {formatStage(item.stage)} · {item.reason}</small></span>
                    <ArrowRight size={15} />
                  </Link>
                ))}</div>
              ) : <p className="live-empty">No cases currently need attention.</p>}
            </section>
            <section className="live-panel live-pipeline">
              <div className="live-panel-heading"><div><p className="eyebrow">WORKFLOW</p><h2>Pipeline at a glance</h2></div></div>
              <div className="pipeline-grid">
                {PIPELINE_STAGES.map((stage) => (
                  <div className="pipeline-tile" key={stage}><span>{formatStage(stage)}</span><b>{pipelineAtAGlance[stage] ?? 0}</b></div>
                ))}
              </div>
            </section>
          </div>
          <section className="live-panel live-recent">
            <div className="live-panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent submissions</h2></div><Link to="/submissions">Browse submissions <ArrowUpRight size={14} /></Link></div>
            <SubmissionRows rows={recent} />
          </section>
          {(overview.operations || overview.finance) && <section className="live-panel live-recent">
            <div className="live-panel-heading"><div><p className="eyebrow">OPERATIONS & FINANCE</p><h2>Service summaries</h2></div></div>
            <div className="service-summary-grid">
              {overview.operations && <article className="service-summary">
                <h3>Facilities</h3>
                {overview.operations.availability === 'AVAILABLE' ? <>
                  <SummaryValue label="Equipment under repair" value={overview.operations.equipmentUnderRepair} />
                  <SummaryValue label="Bookings today" value={overview.operations.bookingsToday} />
                  <SummaryValue label="Facilities free now" value={overview.operations.facilitiesFreeNow} />
                </> : <p className="live-note">{overview.operations.reason || 'Operations integration is not configured.'}</p>}
              </article>}
              {overview.finance && <article className="service-summary">
                <h3>Finance</h3>
                {overview.finance.availability === 'AVAILABLE' ? <>
                  <SummaryValue label="Income month to date" value={overview.finance.incomeMonthToDate} />
                  <IncomeBars bars={overview.finance.incomeBars} />
                </> : <p className="live-note">{overview.finance.reason || 'Finance integration is not configured.'}</p>}
              </article>}
            </div>
          </section>}
          {overview.recentActivity && <section className="live-panel live-recent">
            <div className="live-panel-heading"><div><p className="eyebrow">AUDIT</p><h2>Recent activity</h2></div></div>
            {overview.recentActivity.availability === 'AVAILABLE'
              ? overview.recentActivity.items.length
                ? <ul className="activity-feed">{overview.recentActivity.items.map((item, index) => <li key={`${item.occurredAt}-${index}`}><b>{item.action}</b><span>{item.summary}</span><small>{item.actor} · {new Date(item.occurredAt).toLocaleString()}</small></li>)}</ul>
                : <p className="live-empty">No recent activity.</p>
              : <p className="live-note">{overview.recentActivity.reason || 'Activity feed is not configured.'}</p>}
          </section>}
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value, note }) {
  return <article className="live-metric"><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

function SummaryValue({ label, value }) {
  return <p className="summary-value"><span>{label}</span><b>{value ?? '—'}</b></p>;
}

function IncomeBars({ bars }) {
  const maximum = Math.max(0, ...bars.map((bar) => bar.income));
  return <div className="income-bar-chart" aria-label="Income by period">
    {bars.map((bar) => <div className="income-bar-column" key={bar.period}>
      <b>{bar.income}</b>
      <div className="income-bar-track"><span style={{ height: `${maximum ? Math.max(3, (bar.income / maximum) * 100) : 0}%` }} /></div>
      <small>{bar.period}</small>
    </div>)}
  </div>;
}
