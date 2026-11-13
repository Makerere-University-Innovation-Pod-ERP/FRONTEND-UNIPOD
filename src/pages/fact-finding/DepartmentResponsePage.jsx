import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Undo2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';

export function DepartmentResponsePage({ token, onUnauthorized }) {
  const { id = '' } = useParams();
  const [caseFile, setCaseFile] = useState(null);
  const [allowedStages, setAllowedStages] = useState([]);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [responded, setResponded] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const [current, transitions] = await Promise.all([
        backendApi.caseFile(token, id, signal),
        backendApi.allowedTransitions(token, id, signal),
      ]);
      setCaseFile(current);
      setAllowedStages(transitions.allowedTransitions);
    } catch (thrown) {
      if (thrown instanceof ApiError && thrown.status === 401) onUnauthorized();
      else if (!(thrown instanceof DOMException && thrown.name === 'AbortError')) {
        setError(thrown instanceof Error ? thrown.message : 'Could not load this case.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, id, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function respond(toStage, requireReason) {
    if (requireReason && !reason.trim()) {
      setReasonError('A reason is required before you can decline or send this case back.');
      return;
    }
    setReasonError('');
    setBusy(true);
    setError('');
    try {
      await backendApi.transition(token, id, { to_stage: toStage, note: reason.trim(), version: caseFile.submission.version });
      setResponded(true);
    } catch (thrown) {
      if (thrown instanceof ApiError && thrown.status === 401) onUnauthorized();
      else setError(thrown instanceof Error ? thrown.message : 'The response could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading case…</div>;
  if (!caseFile) {
    return (
      <div className="live-page">
        <Link to="/fact-finding/department" className="back-link"><ArrowLeft size={15} />Back to department queue</Link>
        {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      </div>
    );
  }

  const submission = caseFile.submission;
  const canAccept = allowedStages.includes('UNDER_REVIEW');
  const canSendBack = allowedStages.includes('FACT_FINDING');

  if (responded) {
    return (
      <div className="live-page page-enter">
        <Link to="/fact-finding/department" className="back-link"><ArrowLeft size={15} />Back to department queue</Link>
        <section className="live-panel">
          <p className="eyebrow">RESPONSE RECORDED</p>
          <h1>Response sent.</h1>
          <p>{submission.title} has been updated and removed from the department queue.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="live-page page-enter">
      <Link to="/fact-finding/department" className="back-link"><ArrowLeft size={15} />Back to department queue</Link>
      <div className="live-page-heading detail-heading">
        <div><p className="eyebrow">DEPARTMENT RESPONSE · {submission.code || 'UNCODED'}</p><h1>{submission.title}</h1><p>{submission.category === 'student' ? 'Student project' : 'General innovation'} · Forwarded {submission.forwardedAt ? formatDate(submission.forwardedAt) : 'recently'}</p></div>
        <span className={`stage-pill stage-${submission.stage.toLowerCase()}`}>{formatStage(submission.stage)}</span>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
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
            <div className="live-panel-heading"><div><p className="eyebrow">RESPONSE</p><h2>Accept, decline, or send back</h2></div></div>
            <label className="form-field">Reason <span className="field-note">Required for decline/send back; optional for accept</span>
              <textarea rows={3} maxLength={2000} value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(''); }} />
            </label>
            {reasonError && <p className="api-error" role="alert">{reasonError}</p>}
            <div className="form-actions" style={{ justifyContent: 'flex-start', gap: 8 }}>
              <button className="btn btn-primary" type="button" disabled={busy || !canAccept} onClick={() => void respond('UNDER_REVIEW', false)}>
                {busy ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}Accept
              </button>
              <button className="btn btn-outline" type="button" disabled={busy || !canSendBack} onClick={() => void respond('FACT_FINDING', true)}>
                {busy ? <LoaderCircle size={14} className="spin" /> : <Undo2 size={14} />}Decline / send back
              </button>
            </div>
            <p className="live-note" style={{ marginTop: 10 }}>Accepting moves this case to Under review. Declining or sending it back returns it for the coordinator to reassign — the submitter is never contacted directly from here.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
