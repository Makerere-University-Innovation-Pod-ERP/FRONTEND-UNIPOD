import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Clock,
  LoaderCircle,
  RotateCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useImprovementQueue } from '@/hooks/useCoordinator';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/lib/presentation';
import { calendarDaysUntil, deadlineLabel } from '@/lib/case-status';
import './coordinator.css';

/**
 * Innovation Coordinator — ideas being improved (Assignment 2, page 3).
 *
 * A read-only queue of briefs waiting on an improved version from the
 * submitter. Layout follows the Figma "Refinement Workspace" frames
 * (132:4695 / 159:4528), queue pane only: the refinement request itself is
 * page 4 and the resubmission compare view is page 5, so nothing here writes.
 */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'within', label: 'Within deadline' },
  { id: 'overdue', label: 'Overdue' },
];

const TONE_ICON = {
  overdue: TriangleAlert,
  attention: Clock,
  neutral: CalendarClock,
  none: CalendarClock,
};

export function CoordinatorImprovementsPage({ token, onUnauthorized }) {
  const query = useImprovementQueue(token);
  const { data, isLoading, error } = query;
  const [filterId, setFilterId] = useState('all');
  const [search, setSearch] = useState('');

  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) onUnauthorized();
  }, [unauthorized, onUnauthorized]);

  const cases = useMemo(() => data ?? [], [data]);

  const overdueCount = cases.filter((item) => (calendarDaysUntil(item.dueDate) ?? 0) < 0).length;
  const dueSoonCount = cases.filter((item) => {
    const days = calendarDaysUntil(item.dueDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const term = search.trim().toLowerCase();
  const visible = cases.filter((item) => {
    const days = calendarDaysUntil(item.dueDate);
    const matchesFilter =
      filterId === 'all' ||
      (filterId === 'overdue' ? days !== null && days < 0 : days === null || days >= 0);
    if (!matchesFilter) return false;
    if (!term) return true;
    return (
      item.title.toLowerCase().includes(term) ||
      item.id.toLowerCase().includes(term) ||
      (item.code ?? '').toLowerCase().includes(term)
    );
  });

  const filtering = Boolean(term) || filterId !== 'all';

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">COORDINATOR · REFINEMENT</p>
          <h1>Ideas being improved.</h1>
          <p>Briefs waiting on an improved version from the submitter.</p>
        </div>
      </div>

      {error && !unauthorized && (
        <div className="api-error api-error-banner" role="alert">
          <CircleAlert size={17} />
          <span>
            {error instanceof Error ? error.message : 'Could not load the improvement queue.'}
          </span>
          <button type="button" className="btn btn-outline" onClick={() => void query.refetch()}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="live-loading">
          <LoaderCircle className="spin" size={22} />
          Loading briefs being improved…
        </div>
      ) : (
        <>
          <section className="live-metrics" aria-label="Improvement queue summary">
            <Metric label="In this queue" value={cases.length} note="Awaiting an improved version" />
            <Metric label="Overdue" value={overdueCount} note="Past the agreed date" />
            <Metric label="Due within 7 days" value={dueSoonCount} note="Deadline approaching" />
          </section>

          <section className="live-panel">
            <div className="coordinator-queue-toolbar">
              <div className="coordinator-search">
                <label className="visually-hidden" htmlFor="improvement-search">
                  Search by title or reference
                </label>
                <Search size={15} aria-hidden="true" />
                <input
                  id="improvement-search"
                  type="search"
                  value={search}
                  placeholder="Search by title or reference…"
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="coordinator-search-clear"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="coordinator-queue-filters" role="group" aria-label="Filter by deadline">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className="coordinator-filter"
                    aria-pressed={filter.id === filterId}
                    onClick={() => setFilterId(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="coordinator-result-count" role="status">
              {visible.length} of {cases.length} {cases.length === 1 ? 'case' : 'cases'}
            </p>

            {visible.length ? (
              <ul className="coordinator-improvement-list">
                {visible.map((item) => (
                  <ImprovementCard key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <div className="coordinator-empty-block">
                <p className="live-empty">
                  {cases.length === 0
                    ? 'No briefs are waiting on an improved version.'
                    : 'No cases match this search or filter.'}
                </p>
                {filtering && cases.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setSearch('');
                      setFilterId('all');
                    }}
                  >
                    Clear search and filters
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ImprovementCard({ item }) {
  const deadline = deadlineLabel(item.dueDate);
  const ToneIcon = TONE_ICON[deadline.tone] ?? CalendarClock;

  return (
    <li>
      <article className="coordinator-improvement">
        <div className="coordinator-improvement-main">
          <h2>{item.title}</h2>
          <p className="coordinator-improvement-ref">
            {item.id} · {item.code || 'Uncoded'}
          </p>
          <dl className="coordinator-improvement-meta">
            <div>
              <dt>Applicant</dt>
              <dd>{item.submitterName ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Improvement requested</dt>
              <dd>{formatDate(item.requestedAt)}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{item.dueDate ? formatDate(item.dueDate) : 'Not set'}</dd>
            </div>
            <div>
              <dt>Current version</dt>
              <dd>v{item.versions}</dd>
            </div>
          </dl>
        </div>
        <div className="coordinator-improvement-side">
          <span className={`coordinator-deadline deadline-${deadline.tone}`}>
            <ToneIcon size={13} aria-hidden="true" />
            {deadline.label}
          </span>
          <Link className="btn btn-primary" to={`/coordinator/briefs/${item.id}/changes`}>
            Open request
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </li>
  );
}

function Metric({ label, value, note }) {
  return (
    <article className="live-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
