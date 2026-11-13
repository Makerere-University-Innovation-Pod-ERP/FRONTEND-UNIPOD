import { Link } from 'react-router-dom';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/lib/presentation';
import { categoryLabel } from './helpers';

/** Red error box with an optional "Try again" button. Shows nothing when there is no error. */
export function ErrorBanner({ error, fallback, onRetry }) {
  if (!error || (error instanceof ApiError && error.status === 401)) return null;
  return (
    <div className="api-error api-error-banner" role="alert">
      <CircleAlert size={17} />
      {error instanceof Error ? error.message : fallback}
      {onRetry && <button type="button" className="btn btn-outline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Loading({ label }) {
  return <div className="live-loading"><LoaderCircle className="spin" size={20} />{label}</div>;
}

export function Counter({ label, value }) {
  return <article className="live-metric"><p>{label}</p><strong>{value}</strong></article>;
}

/** The table used by Reception home and the Missing documents list. */
export function BriefTable({ items, showDueDate = false }) {
  return (
    <div className="live-table-wrap">
      <table className="live-table">
        <thead>
          <tr>
            <th>Brief</th>
            <th>Type</th>
            <th>Submitter</th>
            {showDueDate ? <th>Missing items due</th> : <th>Submitted</th>}
            <th><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link className="case-title" to={`/reception/briefs/${item.id}`}>
                  <b>{item.title}</b><small>{item.id}</small>
                </Link>
              </td>
              <td>{categoryLabel(item.category)}</td>
              <td>{item.submitterName}</td>
              <td>{showDueDate ? formatDate(item.dueDate) : formatDate(item.submittedAt)}</td>
              <td><Link className="btn btn-outline" to={`/reception/briefs/${item.id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
