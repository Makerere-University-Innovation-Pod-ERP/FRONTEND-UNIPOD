import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CircleAlert, LoaderCircle, Save } from 'lucide-react';
import { useReviewerCase, useSubmitDecision } from '@/hooks/useReviewer';
import { reviewDecisionSchema } from '@/services/reviewer';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';

const decisionLabel = {
  pending: 'Decision pending',
  recommended: 'Recommended',
  changes_needed: 'Changes needed',
  not_recommended: 'Not recommended',
};

const decisionOptions = [
  { value: 'recommended', label: 'Recommended', hint: 'The project is ready to proceed as submitted.' },
  { value: 'changes_needed', label: 'Changes needed', hint: 'Specific changes are required before this can proceed.' },
  { value: 'not_recommended', label: 'Not recommended', hint: 'This project should not proceed.' },
];

export function ReviewerCaseFile({ token, onUnauthorized }) {
  const { id = '' } = useParams();
  const { data: summary, isLoading, error } = useReviewerCase(token, id);
  const submitDecision = useSubmitDecision(token, id);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(reviewDecisionSchema),
    defaultValues: { decision: undefined, comment: '' },
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  if (isLoading) return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading case file…</div>;
  if (!summary) {
    return (
      <div className="live-page">
        <Link to="/reviewer/workspace" className="back-link"><ArrowLeft size={15} />Back to review workspace</Link>
        {error && !(error instanceof ApiError && error.status === 401) && (
          <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />This case could not be loaded.</div>
        )}
      </div>
    );
  }

  const decided = summary.decisionStatus !== 'pending';

  const onSubmit = handleSubmit((values) => {
    void submitDecision.mutateAsync(values);
  });

  return (
    <div className="live-page page-enter">
      <Link to="/reviewer/workspace" className="back-link"><ArrowLeft size={15} />Back to review workspace</Link>
      <div className="live-page-heading detail-heading">
        <div><p className="eyebrow">REVIEWER CASE FILE · {summary.code || 'UNCODED'}</p><h1>{summary.title}</h1></div>
        <span className={`decision-badge decision-${summary.decisionStatus}`}>{decisionLabel[summary.decisionStatus]}</span>
      </div>
      <div className="detail-grid">
        <section className="live-panel case-summary">
          <div className="live-panel-heading"><div><p className="eyebrow">SUBMISSION</p><h2>Project summary</h2></div></div>
          <div className="case-fields">
            <Field label="Purpose" value={summary.purpose} />
            <Field label="Problem addressed" value={summary.problemAddressed} />
          </div>
        </section>
        <aside className="detail-side">
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">REFERENCE</p><h2>Applicable department rules</h2></div></div>
            <p className="live-note">General rules: reviews must be impartial and evidence-based; conflicts of interest must be declared before a decision is recorded.</p>
            <p className="field-note" style={{ marginTop: 8 }}>Department-specific rules aren't published yet — this reference will come from the department rules manager (Assignment 12) once it ships.</p>
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">SUPPORTING FILES</p><h2>Documents</h2></div></div>
            {summary.documents.length
              ? <ul className="document-list">{summary.documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)}</small></span></li>)}</ul>
              : <p className="live-empty">No documents recorded for this case.</p>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">DECISION</p><h2>Independent review</h2></div></div>
            {decided ? (
              <div className="outcome-summary">
                <Field label="Decision" value={decisionLabel[summary.decisionStatus]} />
                <Field label="Comment" value={summary.comment} />
                {summary.decidedAt && <Field label="Decided" value={summary.decidedAt} />}
                <p className="live-note" style={{ marginTop: 8 }}>A submitted review cannot be edited.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <div className="checklist">
                  {decisionOptions.map((option) => (
                    <label className="checklist-item" key={option.value}>
                      <input type="radio" value={option.value} {...register('decision')} />
                      <span className="checklist-item-body"><b>{option.label}</b><small>{option.hint}</small></span>
                    </label>
                  ))}
                </div>
                {errors.decision && <p className="api-error" role="alert" style={{ marginTop: 8 }}>Choose one of the three outcomes.</p>}
                <label className="form-field" style={{ marginTop: 14 }}>Comment
                  <textarea rows={3} {...register('comment')} placeholder="Required for every decision" />
                </label>
                {errors.comment && <p className="api-error" role="alert">{errors.comment.message}</p>}
                {submitDecision.isError && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />Could not submit this decision.</div>}
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={submitDecision.isPending}>
                    {submitDecision.isPending ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}
                    Submit decision
                  </button>
                </div>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
