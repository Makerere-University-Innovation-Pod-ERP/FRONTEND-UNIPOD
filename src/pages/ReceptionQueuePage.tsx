import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { ApiError, backendApi, type ReceptionQueue } from '@/services/backend-api';
import { formatDate } from '@/lib/presentation';

export function ReceptionQueuePage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [queue, setQueue] = useState<ReceptionQueue | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setQueue(await backendApi.receptionQueue(token, page, 25, signal));
      setError('');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Could not load the reception queue.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, page, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">WORKSPACE · INTAKE</p><h1>Reception queue</h1><p>Draft submissions awaiting intake review.</p></div>
        <button className="btn btn-outline" disabled={loading} onClick={() => { setLoading(true); void load(); }}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh
        </button>
      </div>
      {queue && <section className="live-metrics" aria-label="Reception queue summary">
        <Metric label="In queue" value={queue.inQueueCount} />
        <Metric label="Awaiting action" value={queue.awaitingActionCount} />
        <Metric label="Recently updated" value={queue.recentlyUpdatedCount} />
      </section>}
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <section className="live-panel">
        {loading && !queue
          ? <div className="live-loading"><LoaderCircle className="spin" size={20} />Loading reception queue…</div>
          : queue?.items.length
            ? <div className="live-table-wrap"><table className="live-table">
              <thead><tr><th>Draft</th><th>Type</th><th>Stage</th><th>Submitted</th><th /></tr></thead>
              <tbody>{queue.items.map((item) => <tr key={item.id}>
                <td><Link className="case-title" href={`/submissions/${item.id}`}><b>{item.title}</b><small>{item.code || 'Draft · no reference yet'}</small></Link></td>
                <td>{item.category === 'student' ? 'Student project' : 'General innovation'}</td>
                <td>{item.stage}</td>
                <td>{formatDate(item.createdAt)}</td>
                <td><Link className="btn btn-outline" href={`/submissions/${item.id}`}>Open draft</Link></td>
              </tr>)}</tbody>
            </table></div>
            : queue ? <p className="live-empty">There are no drafts in the reception queue.</p> : null}
        {queue && <div className="pagination">
          <span>{queue.totalElements} drafts</span>
          <div>
            <button className="btn btn-outline" disabled={page <= 0 || loading} onClick={() => { setLoading(true); setPage((value) => Math.max(0, value - 1)); }}>Previous</button>
            <span>Page {queue.totalPages ? page + 1 : 0} of {queue.totalPages}</span>
            <button className="btn btn-outline" disabled={page + 1 >= queue.totalPages || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</button>
          </div>
        </div>}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="live-metric"><p>{label}</p><strong>{value}</strong></article>;
}
