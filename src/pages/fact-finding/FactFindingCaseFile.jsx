import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { useFactFindingCase } from '@/hooks/useFactFinding';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function FactFindingCaseFile({ token, onUnauthorized }) {
  const { id = '' } = useParams();
  const { data: caseFile, isLoading, error } = useFactFindingCase(token, id);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  if (isLoading) return <div className="live-page"><LoadingSkeleton label="Loading case file…" variant="detail" /></div>;
  if (!caseFile) {
    return (
      <div className="live-page">
        <Link to="/fact-finding/queue" className="back-link"><ArrowLeft size={15} />Back to fact-finding</Link>
        {error && !(error instanceof ApiError && error.status === 401) && (
          <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />This case could not be loaded.</div>
        )}
      </div>
    );
  }

  const { submission, documents, stageHistory } = caseFile;

  return (
    <div className="live-page page-enter">
      <Link to="/fact-finding/queue" className="back-link"><ArrowLeft size={15} />Back to fact-finding</Link>
      <div className="live-page-heading detail-heading">
        <div><p className="eyebrow">CASE FILE · {submission.code || 'UNCODED'}</p><h1>{submission.title}</h1><p>{submission.category === 'student' ? 'Student project' : 'General innovation'}</p></div>
        <span className={`stage-pill stage-${submission.stage.toLowerCase()}`}>{formatStage(submission.stage)}</span>
      </div>
      <div className="detail-grid">
        <section className="live-panel case-summary">
          <div className="live-panel-heading"><div><p className="eyebrow">SUBMISSION</p><h2>Project summary</h2></div></div>
          <div className="case-fields">
            <Field label="Purpose" value={submission.purpose} />
            <Field label="Problem addressed" value={submission.problemAddressed} />
          </div>
        </section>
        <aside className="detail-side">
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">CASE HISTORY</p><h2>Stage history</h2></div></div>
            {stageHistory.length ? <ol className="history-list">{stageHistory.map((entry) => <li key={`${entry.changedAt}-${entry.toStage}`}><span className="history-dot" /><b>{formatStage(entry.toStage)}</b><small>{entry.changedBy}</small>{entry.note && <p>{entry.note}</p>}</li>)}</ol> : <p className="live-empty">No stage changes recorded yet.</p>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">SUPPORTING FILES</p><h2>Documents</h2></div></div>
            {documents.length ? <ul className="document-list">{documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)}</small></span></li>)}</ul> : <p className="live-empty">No documents have been added to this case.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
