import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, LockKeyhole, Plus, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, backendApi, type PageResponse, type SubmitterCapabilities, type SubmitterSubmission } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';
import { BRIEF_TYPE_LABELS, loadBriefs, type BriefRecord } from '@/lib/brief';

export function MySubmissionsPage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [result, setResult] = useState<PageResponse<SubmitterSubmission> | null>(null);
  const [capabilities, setCapabilities] = useState<SubmitterCapabilities | null>(null);
  const [briefs] = useState<Record<string, BriefRecord>>(() => loadBriefs());
  const [page, setPage] = useState(0);
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
    }).catch((reason: unknown) => {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Could not load your submissions.');
      }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, page, onUnauthorized]);

  const localBriefs = Object.values(briefs)
    .filter((brief) => brief.localOnly)
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

  function typeLabel(id: string, category: 'student' | 'general'): string {
    const type = briefs[id]?.type;
    if (type) return BRIEF_TYPE_LABELS[type];
    return category === 'student' ? 'Student project' : 'General innovation';
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">MY WORKSPACE · SUBMITTER HOME</p>
          <h1>My submissions</h1>
          <p>Submit a brief, follow its progress, and answer requests for more information.</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-primary" to="/submissions/new"><Plus size={15} />Submit a brief</Link>
        </div>
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

      {localBriefs.length > 0 && <section className="live-panel local-briefs" aria-label="Briefs saved in this browser">
        <div className="live-panel-heading">
          <div>
            <p className="eyebrow">SAVED IN THIS BROWSER</p>
            <h2>Briefs waiting for reception</h2>
          </div>
          <span className="local-brief-count">{localBriefs.length}</span>
        </div>
        <p className="field-note">
          These briefs completed the 5-step submission workflow, but the current backend does not let submitter
          accounts create a case. They are not registered and have no tracking reference yet.
        </p>
        <ul className="local-brief-list">
          {localBriefs.map((brief) => <li key={brief.submissionId}>
            <Link className="case-title" to={`/submissions/${brief.submissionId}`}>
              <b>{brief.title || 'Untitled brief'}</b>
              <small>{BRIEF_TYPE_LABELS[brief.type]} · saved {formatDate(brief.submittedAt)} · reference pending</small>
            </Link>
            <div className="local-brief-actions">
              <span className="stage-pill stage-draft">Saved locally</span>
              <Link className="btn btn-outline" to={`/submissions/${brief.submissionId}/confirmation`}>Confirmation<Send size={13} /></Link>
            </div>
          </li>)}
        </ul>
      </section>}

      <section className="live-panel">
        {loading
          ? <div className="live-loading"><LoaderCircle className="spin" size={20} />Loading your submissions…</div>
            : result?.items.length
            ? <div className="live-table-wrap"><table className="live-table">
              <thead><tr><th>Case</th><th>Type</th><th>Stage</th><th>Received</th><th>Updated</th></tr></thead>
              <tbody>{result.items.map((item) => <tr key={item.id}>
                <td><Link className="case-title" to={`/submissions/${item.id}`}><b>{item.title}</b><small>{item.code || 'Draft · no reference yet'}</small></Link></td>
                <td>{typeLabel(item.id, item.category)}</td>
                <td>{formatStage(item.stage)}</td>
                <td>{item.receivedAt ? formatDate(item.receivedAt) : 'Not received'}</td>
                <td>{formatDate(item.updatedAt)}</td>
              </tr>)}</tbody>
            </table><div className="pagination">
              <span>{result.totalElements} {result.totalElements === 1 ? 'submission' : 'submissions'}</span>
              <div><button className="btn btn-outline" disabled={page <= 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><span>Page {result.totalPages ? page + 1 : 0} of {result.totalPages}</span><button className="btn btn-outline" disabled={page + 1 >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>
            </div></div>
            : result && <p className="live-empty">No submissions are linked to your account yet. Use “Submit a brief” to start one.</p>}
      </section>
    </div>
  );
}
