import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleAlert, Download, LoaderCircle } from 'lucide-react';
import { backendApi, ApiError } from '@/services/backend-api';
import './reports-analytics.css';

const STAGES = [
  ['RECEIVED', 'Received'],
  ['REGISTERED', 'Registered'],
  ['FACT_FINDING', 'Fact-finding'],
  ['UNDER_REVIEW', 'Under Review'],
  ['REFINEMENT_REQUESTED', 'Refinement Requested'],
  ['FORWARDED', 'Forwarded'],
  ['FURTHER_HANDLING', 'Further Handling'],
  ['COMPLETED', 'Completed'],
];

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function exportReport(overview, stages, completionRate, metrics) {
  const rows = [
    ['Report', 'Reports & Analytics'],
    ['Generated', new Date().toLocaleDateString()],
    ['Total submissions', overview.totalSubmissions ?? 0],
    ['Active submissions', metrics.active],
    ['Awaiting action', metrics.awaitingAction],
    ['Awaiting review', metrics.awaitingReview],
    ['Refinement requested', metrics.refinementRequested],
    ['Student projects', overview.studentSubmissions ?? 0],
    ['General innovations', overview.generalSubmissions ?? 0],
    ['Completion rate', `${completionRate}%`],
    [],
    ['Pipeline stage', 'Submissions'],
    ...stages.map(([label, count]) => [label, count]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `reports-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stageLabel(key) {
  return key.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReportsAnalyticsPage({ token, onUnauthorized }) {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: ({ signal }) => backendApi.dashboard(token, signal),
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized?.();
  }, [error, onUnauthorized]);

  if (isLoading) {
    return (
      <div className="reports-state" role="status">
        <LoaderCircle className="spin" size={20} />
        Loading reports…
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-state reports-state-error" role="alert">
        <CircleAlert size={18} />
        {error instanceof Error ? error.message : 'Could not load reports.'}
      </div>
    );
  }

  const stageCounts = overview.pipelineAtAGlance ?? overview.byStage ?? {};
  const stageRows = [
    ...STAGES.map(([key, label]) => [label, stageCounts[key] ?? 0]),
    ...Object.entries(stageCounts)
      .filter(([key]) => !STAGES.some(([stage]) => stage === key))
      .map(([key, count]) => [stageLabel(key), count]),
  ].filter(([, count]) => count > 0);
  const total = overview.totalSubmissions ?? 0;
  const student = overview.studentSubmissions ?? 0;
  const general = overview.generalSubmissions ?? 0;
  const unclassified = Math.max(0, total - student - general);
  const completed = overview.completedCount ?? stageCounts.COMPLETED ?? 0;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const active = Math.max(0, total - completed);
  const awaitingAction = overview.awaitingActionCount ?? overview.needsAttention?.length ?? 0;
  const awaitingReview = overview.awaitingReviewCount ?? stageCounts.UNDER_REVIEW ?? 0;
  const refinementRequested = overview.refinementRequestedCount ?? stageCounts.REFINEMENT_REQUESTED ?? 0;
  const studentRate = total ? (student / total) * 100 : 0;
  const generalRate = total ? (general / total) * 100 : 0;
  const unclassifiedRate = total ? (unclassified / total) * 100 : 0;
  const maxStageCount = Math.max(1, ...stageRows.map(([, count]) => count));

  return (
    <div className="reports-page page-enter">
      <header className="reports-heading">
        <div>
          <p className="reports-eyebrow">Management</p>
          <h1>Reports &amp; Analytics</h1>
          <p>Department and management dashboards with exportable summaries.</p>
        </div>
        <button
          type="button"
          className="reports-export"
          onClick={() => exportReport(overview, stageRows, completionRate, {
            active,
            awaitingAction,
            awaitingReview,
            refinementRequested,
          })}
        >
          <Download size={15} />
          Export summary
        </button>
      </header>

      <section className="reports-metrics" aria-label="Submission metrics">
        <article className="reports-metric-card">
          <p>Active submissions</p>
          <strong>{active}</strong>
          <small>{total} total · {completed} completed</small>
        </article>
        <article className="reports-metric-card">
          <p>Awaiting action</p>
          <strong>{awaitingAction}</strong>
          <small>Need a department or reviewer</small>
        </article>
        <article className="reports-metric-card">
          <p>Awaiting review</p>
          <strong>{awaitingReview}</strong>
          <small>Currently in the review stage</small>
        </article>
        <article className="reports-metric-card">
          <p>Refinement requested</p>
          <strong>{refinementRequested}</strong>
          <small>Waiting for updated information</small>
        </article>
      </section>

      <div className="reports-grid">
        <section className="reports-card reports-stages" aria-labelledby="reports-stages-title">
          <h2 id="reports-stages-title">Submissions by stage</h2>
          {stageRows.length ? (
            <div className="reports-stage-list">
              {stageRows.map(([label, count]) => (
                <div className="reports-stage-row" key={label}>
                  <div className="reports-stage-label">
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                  <div
                    className="reports-track"
                    role="progressbar"
                    aria-label={`${label} submissions`}
                    aria-valuemin={0}
                    aria-valuemax={maxStageCount}
                    aria-valuenow={count}
                  >
                    <span style={{ width: `${(count / maxStageCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="reports-empty">No submissions have been recorded yet.</p>
          )}
        </section>

        <section className="reports-card reports-split" aria-labelledby="reports-split-title">
          <h2 id="reports-split-title">Student vs. public split</h2>
          <div className="reports-split-content">
            <div
              className="reports-donut"
              role="img"
              aria-label={`${student} student projects, ${general} general innovations${unclassified ? `, ${unclassified} unclassified` : ''}`}
              style={{
                '--student-rate': `${studentRate}%`,
                '--general-end': `${studentRate + generalRate}%`,
                '--unclassified-end': `${studentRate + generalRate + unclassifiedRate}%`,
              }}
            >
              <span>{Math.round(studentRate)}%</span>
            </div>
            <ul className="reports-legend">
              <li><span className="reports-legend-dot reports-legend-student" />Student projects <b>{student}</b></li>
              <li><span className="reports-legend-dot reports-legend-general" />General innovations <b>{general}</b></li>
              {unclassified > 0 && (
                <li><span className="reports-legend-dot reports-legend-other" />Other <b>{unclassified}</b></li>
              )}
            </ul>
          </div>
        </section>

        <section className="reports-card reports-completion" aria-labelledby="reports-completion-title">
          <h2 id="reports-completion-title">Completion rate</h2>
          <strong>{completionRate}%</strong>
          <p>{completed} of {total} submissions completed</p>
        </section>

        <section className="reports-card reports-income" aria-labelledby="reports-income-title">
          <h2 id="reports-income-title">Income trend</h2>
          <div className="reports-income-empty">
            Payment trend data isn’t available in the dashboard feed yet.
          </div>
          <p>Verified payment history will appear here when connected.</p>
        </section>
      </div>
    </div>
  );
}
