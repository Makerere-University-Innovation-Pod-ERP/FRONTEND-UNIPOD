import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, UserPlus } from 'lucide-react';
import { useReviewerAssigned, useReviewerCase } from '@/hooks/useReviewer';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';
import { REVIEWER_CANNOT_ASSIGN_REASON } from '@/lib/permissions';

const decisionLabel: Record<string, string> = {
  pending: 'Decision pending',
  recommended: 'Recommended',
  changes_needed: 'Changes needed',
  not_recommended: 'Not recommended',
};

export function ReviewerWorkspace({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const { data: assigned, isLoading, error } = useReviewerAssigned(token);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!selectedId && assigned?.length) setSelectedId(assigned[0].id);
  }, [assigned, selectedId]);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">REVIEWER · REVIEW WORKSPACE</p><h1>Review workspace.</h1><p>Cases currently assigned to you. Reviewer assignment is handled elsewhere in the workflow.</p></div>
      </div>
      {error && !(error instanceof ApiError && error.status === 401) && (
        <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error instanceof Error ? error.message : 'Could not load your assigned cases.'}</div>
      )}
      {isLoading ? (
        <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading your assigned cases…</div>
      ) : !assigned?.length ? (
        <p className="live-empty">No cases are currently assigned to you.</p>
      ) : (
        <div className="queue-grid">
          <nav className="queue-list" aria-label="Assigned cases">
            {assigned.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`queue-row ${item.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(item.id)}
                aria-current={item.id === selectedId}
              >
                <b>{item.title}</b>
                <small>{item.code || 'Uncoded'} · {formatStage(item.stage)}</small>
                <small className="queue-reason">{item.pendingAction}</small>
              </button>
            ))}
          </nav>
          {selectedId && <CaseSummaryPanel token={token} id={selectedId} onUnauthorized={onUnauthorized} />}
        </div>
      )}
    </div>
  );
}

function CaseSummaryPanel({ token, id, onUnauthorized }: { token: string; id: string; onUnauthorized: () => void }) {
  const { data: summary, isLoading, error } = useReviewerCase(token, id);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  if (isLoading) return <section className="live-panel"><div className="live-loading"><LoaderCircle className="spin" size={20} />Loading case…</div></section>;
  if (!summary) return <section className="live-panel"><p className="live-empty">Select a case to view its summary.</p></section>;

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div><p className="eyebrow">CASE · {summary.code || 'UNCODED'}</p><h2>{summary.title}</h2></div>
        <span className={`decision-badge decision-${summary.decisionStatus}`}>{decisionLabel[summary.decisionStatus]}</span>
      </div>
      <div className="case-fields">
        <Field label="Purpose" value={summary.purpose} />
        <Field label="Problem addressed" value={summary.problemAddressed} />
        <Field label="Pending action" value={summary.pendingAction} />
      </div>
      <div className="requirement-block" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 11, color: '#89918a', textTransform: 'uppercase', letterSpacing: '.08em' }}>Documents</h3>
        {summary.documents.length ? (
          <ul className="document-list">{summary.documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)}</small></span></li>)}</ul>
        ) : <p className="live-empty">No documents recorded for this case.</p>}
      </div>
      <div className="case-action">
        <p className="form-section-title">Reviewer actions</p>
        <div className="disabled-control">
          <button className="btn btn-outline" type="button" disabled title={REVIEWER_CANNOT_ASSIGN_REASON}>
            <UserPlus size={14} />Assign reviewer
          </button>
          <span className="disabled-reason">{REVIEWER_CANNOT_ASSIGN_REASON}</span>
        </div>
        <p className="live-note" style={{ marginTop: 10 }}>
          The independent decision form (Recommended / Changes needed / Not recommended) lives on the Reviewer Case File screen, built separately as part of this role's workflow.
        </p>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
