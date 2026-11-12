import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { formatDate } from '@/lib/presentation';

export function DepartmentQueue({ token, onUnauthorized }) {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    backendApi.submissions(token, { stage: 'FORWARDED', page, size: 25 }, controller.signal)
      .then(setResult)
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
        else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'Could not load the department queue.');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, page, onUnauthorized]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">FACT-FINDING OFFICER · DEPARTMENT QUEUE</p><h1>Briefs sent to my department.</h1><p>Cases forwarded here are awaiting an accept, decline, or send-back response.</p></div>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <section className="live-panel">
        {loading
          ? <div className="live-loading"><LoaderCircle className="spin" size={20} />Loading the department queue…</div>
          : result?.items.length
            ? <div className="live-table-wrap"><table className="live-table">
              <thead><tr><th>Case</th><th>Type</th><th>Forwarded</th><th>Sector</th></tr></thead>
              <tbody>{result.items.map((item) => <tr key={item.id}>
                <td><Link className="case-title" to={`/fact-finding/department/${item.id}`}><b>{item.title}</b><small>{item.code || 'Uncoded'}</small></Link></td>
                <td>{item.category === 'student' ? 'Student project' : 'General innovation'}</td>
                <td>{item.forwardedAt ? formatDate(item.forwardedAt) : '—'}</td>
                <td>{item.responsibleSectorName || '—'}</td>
              </tr>)}</tbody>
            </table><div className="pagination">
              <span>{result.totalElements} {result.totalElements === 1 ? 'case' : 'cases'}</span>
              <div><button className="btn btn-outline" disabled={page <= 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><span>Page {result.totalPages ? page + 1 : 0} of {result.totalPages}</span><button className="btn btn-outline" disabled={page + 1 >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>
            </div></div>
            : result && <p className="live-empty">Nothing is currently waiting for a department response.</p>}
      </section>
    </div>
  );
}
