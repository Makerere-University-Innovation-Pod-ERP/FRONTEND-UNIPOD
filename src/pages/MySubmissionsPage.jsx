import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';

const TABS = [
  { id: 'briefs', label: 'Briefs' },
  { id: 'service-requests', label: 'Service requests', reason: 'Service requests belong to the operational domains (Multimedia, Textile, CNC & Carpentry, Telecoms) — not yet built.' },
  { id: 'invoices', label: 'Invoices and payments', reason: 'Invoices and payments are owned by the shared Finance module (Assignment 6) — not yet built.' },
  { id: 'bookings', label: 'Bookings', reason: 'Bookings belong to the operational domains\' schedule/lab/workshop screens — not yet built.' },
];

export function MySubmissionsPage({
  token,
  onUnauthorized,
}) {
  const [result, setResult] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState('briefs');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      backendApi.submitterSubmissions(token, page, 25, controller.signal),
      backendApi.submitterCapabilities(token, controller.signal),
    ]).then(([submissions, currentCapabilities]) => {
      setResult(submissions);
      setCapabilities(currentCapabilities);
    }).catch((reason) => {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Could not load your submissions.');
      }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, page, onUnauthorized]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">MY WORKSPACE · SUBMITTER HOME</p><h1>My submissions</h1><p>Track cases linked to your account. Your case records are read-only.</p></div>
      </div>
      {capabilities && <section className="live-panel submitter-capabilities" aria-label="Account capabilities">
        <div>
          <p className="eyebrow">ACCOUNT ACCESS</p>
          <p>{capabilities.registrationMessage}</p>
        </div>
        <div className="locked-modules">
          {capabilities.lockedModules.map((module) => <span key={module}><LockKeyhole size={13} />{module}</span>)}
        </div>
      </section>}
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <div className="submission-filters" role="tablist" aria-label="My submissions sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab !== 'briefs' ? (
        <section className="live-panel">
          <p className="live-empty">{TABS.find((tab) => tab.id === activeTab)?.reason}</p>
        </section>
      ) : (
        <section className="live-panel">
          {loading
            ? <div className="live-loading"><LoaderCircle className="spin" size={20} />Loading your submissions…</div>
            : result?.items.length
              ? <div className="live-table-wrap"><table className="live-table">
                <thead><tr><th>Case</th><th>Type</th><th>Stage</th><th>Received</th><th>Updated</th></tr></thead>
                <tbody>{result.items.map((item) => {
                  const waitingOnYou = item.stage === 'REFINEMENT_REQUESTED';
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link className="case-title" to={`/submissions/${item.id}`}><b>{item.title}</b><small>{item.code || 'Draft · no reference yet'}</small></Link>
                        {waitingOnYou && <Link to={`/submissions/${item.id}/respond`} className="decision-badge decision-changes_needed" style={{ marginTop: 6, textDecoration: 'none' }}>Waiting on you — respond</Link>}
                      </td>
                      <td>{item.category === 'student' ? 'Student project' : 'General innovation'}</td>
                      <td>{formatStage(item.stage)}</td>
                      <td>{item.receivedAt ? formatDate(item.receivedAt) : 'Not received'}</td>
                      <td>{formatDate(item.updatedAt)}</td>
                    </tr>
                  );
                })}</tbody>
              </table><div className="pagination">
                <span>{result.totalElements} {result.totalElements === 1 ? 'submission' : 'submissions'}</span>
                <div><button className="btn btn-outline" disabled={page <= 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><span>Page {result.totalPages ? page + 1 : 0} of {result.totalPages}</span><button className="btn btn-outline" disabled={page + 1 >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>
              </div></div>
              : result && <p className="live-empty">No submissions are linked to your account yet.</p>}
        </section>
      )}
    </div>
  );
}
