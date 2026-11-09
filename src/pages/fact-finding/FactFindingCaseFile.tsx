import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { useFactFindingCase } from '@/hooks/useFactFinding';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';

export function FactFindingCaseFile({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const { id = '' } = useParams<{ id: string }>();
  const { data: caseFile, isLoading, error } = useFactFindingCase(token, id);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  if (isLoading) return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading case file…</div>;
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

  return (
    <div className="live-page page-enter">
      <Link to="/fact-finding/queue" className="back-link"><ArrowLeft size={15} />Back to fact-finding</Link>
      <div className="live-page-heading detail-heading">
        <div><p className="eyebrow">CASE FILE · {caseFile.code || 'UNCODED'}</p><h1>{caseFile.title}</h1><p>{caseFile.category === 'student' ? 'Student project' : 'General innovation'}</p></div>
        <span className={`stage-pill stage-${caseFile.stage.toLowerCase()}`}>{formatStage(caseFile.stage)}</span>
      </div>
      <div className="detail-grid">
        <section className="live-panel case-summary">
          <div className="live-panel-heading"><div><p className="eyebrow">SUBMISSION</p><h2>Project summary</h2></div></div>
          <div className="case-fields">
            <Field label="Purpose" value={caseFile.purpose} />
            <Field label="Problem addressed" value={caseFile.problemAddressed} />
          </div>
        </section>
        <aside className="detail-side">
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">ASSESSMENT</p><h2>Fact-finding checklist</h2></div></div>
            <ul className="document-list">
              {caseFile.checklist.map((item) => (
                <li key={item.id}>
                  <span>
                    <b>{item.checked ? <Check size={12} /> : null} {item.label}</b>
                    <small>{item.checked ? 'Confirmed' : 'Not yet confirmed'}{item.note ? ` · ${item.note}` : ''}</small>
                  </span>
                </li>
              ))}
            </ul>
            {caseFile.assessment && <div className="case-field" style={{ marginTop: 14 }}><span>Assessment summary</span><p>{caseFile.assessment}</p></div>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">CASE HISTORY</p><h2>Stage history</h2></div></div>
            {caseFile.stageHistory.length ? <ol className="history-list">{caseFile.stageHistory.map((entry) => <li key={`${entry.changedAt}-${entry.toStage}`}><span className="history-dot" /><b>{formatStage(entry.toStage)}</b><small>{entry.changedBy}</small>{entry.note && <p>{entry.note}</p>}</li>)}</ol> : <p className="live-empty">No stage changes recorded yet.</p>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">SUPPORTING FILES</p><h2>Documents</h2></div></div>
            {caseFile.documents.length ? <ul className="document-list">{caseFile.documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)}</small></span></li>)}</ul> : <p className="live-empty">No documents have been added to this case.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
