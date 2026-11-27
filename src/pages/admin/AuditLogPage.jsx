import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, Download, History, LoaderCircle, Search } from 'lucide-react';
import { ApiError, backendApi } from '@/services/backend-api';
import './AuditLogPage.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function AuditLogPage({ token, onUnauthorized }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    backendApi.auditLogs(token, { page, size: 25, q: search, action, outcome, from, to }, controller.signal)
      .then(setResult)
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
        else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'Could not load audit logs.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, page, search, action, outcome, from, to, onUnauthorized]);

  const items = useMemo(() => {
    if (!result) return [];
    return result.items ?? result.content ?? result.entries ?? result.auditLogs ?? (Array.isArray(result) ? result : []);
  }, [result]);

  const actions = useMemo(() => [...new Set(items.map((item) => item.action).filter(Boolean))].sort(), [items]);
  const totalElements = result?.totalElements ?? result?.total ?? items.length;
  const totalPages = result?.totalPages ?? 1;

  function submitSearch(event) {
    event.preventDefault();
    setPage(0);
    setSearch(query.trim());
  }

  function exportCsv() {
    const rows = [
      ['Timestamp', 'Actor', 'Action', 'Summary', 'Resource type', 'Resource ID', 'Outcome', 'IP address'],
      ...items.map((item) => [
        item.occurredAt ?? item.timestamp ?? item.createdAt,
        item.actor ?? item.user ?? item.subject,
        item.action,
        item.summary ?? item.description,
        item.resourceType,
        item.resourceId,
        item.outcome,
        item.ipAddress,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function resetFilters() {
    setQuery('');
    setSearch('');
    setAction('');
    setOutcome('');
    setFrom('');
    setTo('');
    setPage(0);
  }

  return (
    <div className="live-page page-enter audit-log-page">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">PLATFORM · SECURITY</p>
          <h1>Audit Log</h1>
          <p>Trace account, configuration, submission, and access activity across UniPod.</p>
        </div>
        <button className="btn btn-outline" type="button" disabled={loading || items.length === 0} onClick={exportCsv}>
          <Download size={15} />Export CSV
        </button>
      </div>

      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}

      <section className="live-panel audit-log-panel">
        <form className="audit-log-filters" onSubmit={submitSearch}>
          <label className="audit-log-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, action, or resource" aria-label="Search audit logs" />
          </label>
          <label className="audit-log-field">
            <span>Action</span>
            <select value={action} onChange={(event) => { setAction(event.target.value); setPage(0); }}>
              <option value="">All actions</option>
              {actions.map((value) => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
          <label className="audit-log-field">
            <span>Outcome</span>
            <select value={outcome} onChange={(event) => { setOutcome(event.target.value); setPage(0); }}>
              <option value="">All outcomes</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
          </label>
          <label className="audit-log-field">
            <span>From</span>
            <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} />
          </label>
          <label className="audit-log-field">
            <span>To</span>
            <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} />
          </label>
          <button className="btn btn-primary audit-log-search-button" type="submit">Search</button>
          <button className="btn btn-outline" type="button" onClick={resetFilters}>Reset</button>
        </form>

        {loading && !result
          ? <div className="live-loading"><LoaderCircle className="spin" size={20} />Loading audit logs…</div>
          : <div className="live-table-wrap">
            <table className="live-table audit-log-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Summary</th>
                  <th>Resource</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><span className="audit-log-time">{formatDate(item.occurredAt ?? item.timestamp ?? item.createdAt)}</span></td>
                    <td><b>{item.actor ?? item.user ?? item.subject ?? 'System'}</b></td>
                    <td><span className="audit-log-action">{String(item.action ?? 'UNKNOWN').replaceAll('_', ' ')}</span></td>
                    <td>
                      <span className="audit-log-summary">{item.summary ?? item.description ?? '—'}</span>
                      {item.ipAddress && <small>{item.ipAddress}</small>}
                    </td>
                    <td>
                      <span>{item.resourceType ?? '—'}</span>
                      {item.resourceId && <small>{item.resourceId}</small>}
                    </td>
                    <td>
                      <span className={`audit-log-outcome ${String(item.outcome).toUpperCase() === 'FAILURE' ? 'audit-log-outcome-failure' : 'audit-log-outcome-success'}`}>
                        {item.outcome ?? 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <div className="audit-log-empty">
                        <History size={22} />
                        <b>No audit entries found</b>
                        <span>Try changing the search or date filters.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>}

        {result && (
          <div className="pagination">
            <span>{totalElements} {totalElements === 1 ? 'entry' : 'entries'}</span>
            <div>
              <button className="btn btn-outline" disabled={page <= 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
              <span>Page {totalPages ? page + 1 : 0} of {totalPages}</span>
              <button className="btn btn-outline" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
