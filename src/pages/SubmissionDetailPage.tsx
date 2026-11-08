import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CircleAlert, LoaderCircle, RefreshCw, Send, Workflow } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { UserSession } from '@/lib/auth';
import { ApiError, backendApi, type CaseFile, type Sector } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';

const INTAKE_ROLES = ['ROLE_ADMINISTRATOR', 'ROLE_INNOVATION_COORDINATOR', 'ROLE_RECEPTIONIST', 'ROLE_FACT_FINDING_OFFICER'];
const TRANSITION_ROLES = ['ROLE_ADMINISTRATOR', 'ROLE_INNOVATION_COORDINATOR'];

export function SubmissionDetailPage({
  session,
  onUnauthorized,
}: {
  session: UserSession;
  onUnauthorized: () => void;
}) {
  const { id = '' } = useParams<{ id: string }>();
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [allowedStages, setAllowedStages] = useState<string[]>([]);
  const [sectorId, setSectorId] = useState('');
  const [nextStage, setNextStage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const canIntake = session.roles.some((role) => INTAKE_ROLES.includes(role));
  const canTransition = session.roles.some((role) => TRANSITION_ROLES.includes(role));

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const current = await backendApi.caseFile(session.accessToken, id, signal);
      setCaseFile(current);
      const tasks: Promise<void>[] = [];
      if (current.submission.stage === 'DRAFT' && canIntake) {
        tasks.push(backendApi.sectors(session.accessToken, signal).then(setSectors));
      }
      if (current.submission.stage !== 'DRAFT' && canTransition) {
        tasks.push(backendApi.allowedTransitions(session.accessToken, id, signal).then((value) => {
          setAllowedStages(value.allowedTransitions);
          setNextStage((previous) => value.allowedTransitions.includes(previous) ? previous : value.allowedTransitions[0] ?? '');
        }));
      }
      await Promise.all(tasks);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Could not load this case.');
      }
    } finally {
      setLoading(false);
    }
  }, [session.accessToken, id, canIntake, canTransition, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'The case action could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseFile || !nextStage) return;
    await act(() => backendApi.transition(session.accessToken, id, {
      to_stage: nextStage,
      note: note.trim(),
      version: caseFile.submission.version,
    }));
    setNote('');
  }

  if (loading && !caseFile) return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading case file…</div>;
  if (!caseFile) return <div className="live-page"><Link to="/submissions" className="back-link"><ArrowLeft size={15} />Back to submissions</Link>{error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}</div>;

  const submission = caseFile.submission;
  return (
    <div className="live-page page-enter">
      <Link to="/submissions" className="back-link"><ArrowLeft size={15} />Back to submissions</Link>
      <div className="live-page-heading detail-heading">
        <div><p className="eyebrow">CASE FILE · {caseFile.reference || submission.code || 'DRAFT'}</p><h1>{submission.title}</h1><p>{submission.category === 'student' ? 'Student project' : 'General innovation'} · Created {formatDate(submission.createdAt)}</p></div>
        <span className={`stage-pill stage-${submission.stage.toLowerCase()}`}>{formatStage(submission.stage)}</span>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <div className="detail-grid">
        <section className="live-panel case-summary">
          <div className="live-panel-heading"><div><p className="eyebrow">SUBMISSION</p><h2>Project summary</h2></div><button className="icon-button" onClick={() => { setError(''); setLoading(true); void load(); }} aria-label="Refresh case"><RefreshCw size={15} /></button></div>
          <div className="case-fields">
            <Field label="Purpose" value={submission.purpose} />
            <Field label="Problem addressed" value={submission.problemAddressed} />
            <div className="form-grid"><Field label="Registered by" value={submission.registeredBy} /><Field label="Submitter ID" value={submission.submitterId || 'Not linked'} /></div>
            {submission.category === 'student' && <div className="form-grid"><Field label="Student number" value={submission.studentNumber || '—'} /><Field label="Programme" value={submission.programme || '—'} /></div>}
            {submission.category === 'student' && <Field label="Supervisor" value={submission.supervisor || '—'} />}
            <div className="form-grid"><Field label="Responsible sector" value={submission.responsibleSectorName || 'Not assigned'} /><Field label="Recommendation letter" value={submission.recommendationLetterStatus ? formatStage(submission.recommendationLetterStatus) : '—'} /></div>
          </div>
          {canIntake && submission.stage === 'DRAFT' && <div className="case-action">
            <p className="form-section-title">Draft actions</p>
            <div className="action-row"><button className="btn btn-primary" disabled={busy} onClick={() => void act(() => backendApi.register(session.accessToken, id))}><Workflow size={15} />Register as received</button></div>
          </div>}
          {canIntake && submission.stage === 'RECEIVED' && <form className="case-action" onSubmit={(event) => { event.preventDefault(); if (sectorId) void act(() => backendApi.forward(session.accessToken, id, sectorId)); }}>
            <p className="form-section-title">Assign to a sector</p>
            <div className="action-row"><select value={sectorId} onChange={(event) => setSectorId(event.target.value)} required><option value="">Select an active sector</option>{sectors.map((sector) => <option value={sector.id} key={sector.id}>{sector.name}</option>)}</select><button className="btn btn-primary" disabled={busy || !sectors.length}><Send size={14} />Forward</button></div>
          </form>}
        </section>
        <aside className="detail-side">
          {canTransition && allowedStages.length > 0 && <form className="live-panel case-transition" onSubmit={transition}>
            <div className="live-panel-heading"><div><p className="eyebrow">WORKFLOW</p><h2>Next stage</h2></div></div>
            <label className="form-field">Move case to<select value={nextStage} onChange={(event) => setNextStage(event.target.value)}>{allowedStages.map((stage) => <option key={stage} value={stage}>{formatStage(stage)}</option>)}</select></label>
            <label className="form-field">Note <span className="field-note">Optional</span><textarea rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="btn btn-primary" type="submit" disabled={busy || !nextStage}>{busy ? <LoaderCircle size={14} className="spin" /> : <Workflow size={14} />}Update case stage</button>
          </form>}
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">CASE HISTORY</p><h2>Stage history</h2></div></div>
            {caseFile.stageHistory.length ? <ol className="history-list">{caseFile.stageHistory.map((entry) => <li key={`${entry.changedAt}-${entry.toStage}`}><span className="history-dot" /><b>{formatStage(entry.toStage)}</b><small>{entry.changedBy} · {formatDate(entry.changedAt)}</small>{entry.note && <p>{entry.note}</p>}</li>)}</ol> : <p className="live-empty">No stage changes recorded yet.</p>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">SUPPORTING FILES</p><h2>Documents</h2></div></div>
            {caseFile.documents.length ? <ul className="document-list">{caseFile.documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)} · {formatDate(document.createdAt)}</small></span></li>)}</ul> : <p className="live-empty">No documents have been added to this case.</p>}
          </section>
        </aside>
      </div>
      <p className="case-version">Record version {submission.version} · Your permissions are checked by the backend.</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
