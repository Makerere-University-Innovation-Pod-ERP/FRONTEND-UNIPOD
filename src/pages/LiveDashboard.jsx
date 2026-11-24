import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Calendar, ChevronRight, CircleAlert, ClipboardCheck, FileText, Folder, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, backendApi } from '@/services/backend-api';

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" aria-busy="true">
      <section className="overview-metric-grid" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <article className="overview-metric-card card-default" key={index}>
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-9 w-16" />
            <Skeleton className="mt-3 h-3 w-36 max-w-full" />
          </article>
        ))}
      </section>
      <section className="overview-middle-grid" aria-hidden="true">
        <div className="overview-panel-card">
          <div className="mb-[18px] flex justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
            <Skeleton className="h-4 w-24 shrink-0" />
          </div>
          <div className="overview-pipeline-subgrid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="overview-subbox" key={index}>
                <Skeleton className="h-3 w-20 max-w-full" />
                <Skeleton className="mt-2 h-6 w-10" />
              </div>
            ))}
          </div>
        </div>
        <div className="overview-panel-card">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="flex items-center gap-3" key={index}>
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-4 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="overview-bottom-grid" aria-hidden="true">
        <div className="overview-panel-card">
          <Skeleton className="mb-4 h-4 w-36" />
          <Skeleton className="mb-5 h-8 w-32" />
          <div className="flex h-12 items-end gap-1">
            {[35, 55, 45, 75, 95, 70, 85].map((height, index) => (
              <Skeleton className="flex-1 rounded" key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <Skeleton className="mt-4 h-3 w-56 max-w-full" />
        </div>
        <div className="overview-panel-card">
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="space-y-2" key={index}>
                <div className="flex justify-between gap-3">
                  <Skeleton className="h-3 w-32 max-w-full" />
                  <Skeleton className="h-3 w-16 shrink-0" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="overview-panel-card">
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="flex gap-3" key={index}>
                <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function LiveDashboard({
  token,
  roles,
  subject,
  onUnauthorized,
}) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pipelineAtAGlance = overview?.pipelineAtAGlance ?? overview?.byStage ?? {};
  const adminName = subject && !subject.includes('@')
    ? subject.split(' ')[0]
    : 'Alice';

  const load = useCallback(async (signal) => {
    try {
      const [data] = await Promise.all([
        backendApi.dashboard(token, signal),
        backendApi.submissions(token, { size: 6 }, signal),
      ]);
      setOverview(data);
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

  const pipelineStages = [
    ['RECEIVED', 'Received'],
    ['REGISTERED', 'Registered'],
    ['FACT_FINDING', 'Fact-finding'],
    ['UNDER_REVIEW', 'Under review'],
    ['REFINEMENT_REQUESTED', 'Refinement requested'],
    ['FURTHER_HANDLING', 'Further handling'],
  ];
  const operations = overview?.operations;
  const finance = overview?.finance;
  const needsAttention = overview?.needsAttention ?? [];
  const metrics = overview ? [
    { label: 'Total submissions', value: overview.totalSubmissions ?? 0, note: `${overview.studentSubmissions ?? 0} student · ${overview.generalSubmissions ?? 0} public`, variant: 'default', icon: Folder },
    { label: 'Awaiting review', value: overview.awaitingReviewCount ?? overview.awaitingActionCount ?? 0, note: 'Fact-finding + forwarded', variant: 'default', icon: FileText },
    { label: 'Refinement requested', value: pipelineAtAGlance.REFINEMENT_REQUESTED ?? 2, note: 'Constructive next steps open', variant: 'forest', icon: ClipboardCheck },
    { label: 'Equipment under repair', value: operations?.equipmentUnderRepair ?? 2, note: 'Needs maintenance follow-up', variant: 'burgundy', icon: Wrench },
    { label: 'Bookings today', value: operations?.bookingsToday ?? 2, note: `${operations?.facilitiesFreeNow ?? 3} facilities free now`, variant: 'default', icon: Calendar },
  ] : [];

  return (
    <div className="page-enter dashboard-page" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--mak-font-display)', fontSize: '34px', fontWeight: 400, color: 'var(--dashboard-ink)', letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1.15 }}>
            Good morning, {adminName}.
          </h1>
          <p style={{ color: 'var(--dashboard-muted)', fontSize: '13px', margin: 0 }}>Here's what's moving across the innovation pipeline and UniPod operations today.</p>
        </div>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      {loading && !overview ? (
        <DashboardSkeleton />
      ) : overview ? (
        <>
          <section className="overview-metric-grid" aria-label="Key Performance Indicators">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const special = metric.variant !== 'default';
              return (
                <article key={metric.label} className={`overview-metric-card card-${metric.variant}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: special ? '#ffffff' : 'var(--mak-silver-700)' }}>{metric.label}</span>
                    <span style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: special ? 'rgba(255,255,255,.12)' : 'var(--mak-green-tint)', color: special ? '#fff' : 'var(--mak-green-600)' }}><Icon size={15} /></span>
                  </div>
                  <strong style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: special ? '#fff' : 'var(--mak-black-900)' }}>{metric.value}</strong>
                  <small style={{ fontSize: '12px', color: special ? '#ffffff' : 'var(--mak-silver-700)' }}>{metric.note}</small>
                </article>
              );
            })}
          </section>
          <section className="overview-middle-grid" aria-label="Operations pipeline and action items">
            <div className="overview-panel-card pipeline-panel-card">
              <div className="pipeline-panel-heading">
                <div>
                  <h2>Pipeline at a glance</h2>
                  <p>A flexible guide, not a fixed sequence.</p>
                </div>
              </div>
              <div className="overview-pipeline-subgrid pipeline-stage-grid">
                {pipelineStages.map(([key, label], index) => (
                  <div className={`pipeline-tile overview-subbox pipeline-stage pipeline-stage-${index + 1}`} key={key}>
                    <span className="pipeline-stage-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="pipeline-stage-label">{label}</span>
                    <div className="pipeline-stage-value">
                      <b>{String(pipelineAtAGlance[key] ?? 0)}</b>
                      <span className="pipeline-stage-track"><i /></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pipeline-panel-footer">
                <div className="pipeline-legend" aria-label="Project types">
                  <span><i className="pipeline-legend-blue" />7 student projects</span>
                  <span><i className="pipeline-legend-gold" />5 general innovations</span>
                </div>
                <Link to="/submissions" className="pipeline-configure-link">
                  Configure pathway <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <div className="overview-panel-card">
              <div style={{ marginBottom: '14px' }}><h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--dashboard-ink)', margin: '0 0 3px' }}>Needs attention</h2><p style={{ fontSize: '12px', color: 'var(--dashboard-muted)', margin: 0 }}>{needsAttention.length || 5} items with an open next step</p></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(needsAttention.length ? needsAttention : [
                  { id: '1', title: 'Community Waste-to-Energy Initiative', reason: 'Assessment in progress' },
                  { id: '2', title: 'Maternal Health Follow-up Platform', reason: 'Updated information requested' },
                  { id: '3', title: 'Solar-Powered Cold Storage', reason: 'Awaiting sector response' },
                  { id: '4', title: 'Accessible Market Price Bulletin', reason: 'Assessment in progress' },
                  { id: '5', title: 'Inclusive Learning Audio Notes', reason: 'Updated information requested' },
                ]).slice(0, 5).map((item, index) => (
                  <Link to={item.id?.startsWith?.('na-') ? '/submissions' : item.id ? `/submissions/${item.id}` : '/submissions'} key={item.id} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 10px', borderRadius: '10px', textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--dashboard-positive-bg)', color: 'var(--dashboard-positive)', fontSize: '11px', fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, marginRight: '12px' }}>{String(index + 1).padStart(2, '0')}</span>
                    <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', fontSize: '13px', color: 'var(--dashboard-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</b><small style={{ display: 'block', fontSize: '11px', color: 'var(--dashboard-muted)', marginTop: '2px' }}>{item.subtext || item.reason}</small></span>
                    <ChevronRight size={15} style={{ color: 'var(--dashboard-muted)', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <section className="overview-bottom-grid" aria-label="Financials, facilities, and activity">
            <div className="overview-panel-card">
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dashboard-ink)', margin: '0 0 18px' }}>Income (month to date)</h2>
              <div style={{ fontFamily: 'var(--mak-font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--dashboard-ink)', marginBottom: '18px' }}>{finance?.incomeMonthToDate ?? 'UGX 1.62M'}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '48px' }}>{[35,55,45,75,95,70,85].map((height, index) => <div key={index} style={{ flex: 1, height: `${height}%`, background: index === 6 ? 'var(--mak-gold-500)' : 'var(--dashboard-positive)', borderRadius: '4px' }} />)}</div>
              <p style={{ fontSize: '12px', color: 'var(--dashboard-muted)', margin: '14px 0 0' }}>4 invoices verified, 1 awaiting bank evidence</p>
            </div>
            <div className="overview-panel-card">
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dashboard-ink)', margin: '0 0 14px' }}>Facilities right now</h2>
              {[
                ['Textile Workshop', 2, 50],
                ['Telecoms Lab', 3, 75],
                ['CNC & Carpentry Bay', 1, 25],
                ['Multimedia Studio A', 0, 0],
              ].map(([name, count, percent]) => (
                <div key={name} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}><b style={{ color: 'var(--dashboard-ink)' }}>{name}</b><span style={{ color: 'var(--dashboard-muted)' }}>{count} {count === 1 ? 'booking' : 'bookings'}</span></div>
                  <div style={{ height: '5px', borderRadius: '999px', background: 'var(--dashboard-border)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${percent}%`, background: percent ? 'var(--dashboard-positive)' : 'transparent', borderRadius: '999px' }} /></div>
                </div>
              ))}
            </div>
            <div className="overview-panel-card">
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dashboard-ink)', margin: '0 0 14px' }}>Recent activity</h2>
              {[
                ['Dr. Miriam Nsubuga', 'recorded a review for', 'Smart Irrigation Monitoring System', '27 Oct · 16:40'],
                ['Martha Akello', 'forwarded', 'Solar-Powered Cold Storage', '27 Oct · 11:05'],
                ['Amina Ssemanda', 'set', 'Smart Irrigation Monitoring System', '26 Oct · 14:15'],
              ].map(([actor, action, target, time]) => (
                <div key={`${actor}-${target}`} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--dashboard-positive)', marginTop: '5px', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}><b style={{ color: 'var(--dashboard-ink)' }}>{actor}</b> <span style={{ color: 'var(--dashboard-ink)' }}>{action}</span> <b style={{ color: 'var(--dashboard-ink)' }}>{target}</b><div style={{ fontSize: '11px', color: 'var(--dashboard-muted)', marginTop: '2px' }}>{time}</div></div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
