import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, CircleAlert, LoaderCircle, RefreshCw, Send, Workflow } from 'lucide-react';
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
  const [reviewerSubject, setReviewerSubject] = useState('');
  const [outcomeDecision, setOutcomeDecision] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentStatus, setDocumentStatus] = useState('SUBMITTED');
  const [fileReference, setFileReference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const canIntake = session.roles.some((role) => INTAKE_ROLES.includes(role));
  const canTransition = session.roles.some((role) => TRANSITION_ROLES.includes(role));
  const isReceptionist = session.roles.includes('ROLE_RECEPTIONIST');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const current = isReceptionist
        ? asIntakeCaseFile(await backendApi.submissionCaseFile(session.accessToken, id, signal))
        : await backendApi.caseFile(session.accessToken, id, signal);
      setCaseFile(current);
      setReviewerSubject(current.submission.assignedReviewerSubject || '');
      setOutcomeDecision(current.outcome?.decision || '');
      setOutcomeNote(current.outcome?.note || '');
      const tasks: Promise<void>[] = [];
      if (['DRAFT', 'RECEIVED'].includes(current.submission.stage) && canIntake) {
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
  }, [session.accessToken, id, canIntake, canTransition, isReceptionist, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function act(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'The case action could not be completed.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseFile || !nextStage) return;
    if (await act(() => backendApi.transition(session.accessToken, id, {
      to_stage: nextStage,
      note: note.trim(),
      version: caseFile.submission.version,
    }))) setNote('');
  }

  async function saveOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseFile) return;
    await act(() => backendApi.saveOutcome(session.accessToken, id, {
      decision: outcomeDecision.trim(),
      note: outcomeNote.trim(),
      version: caseFile.submission.version,
    }));
  }

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentName.trim()) return;
    if (await act(() => backendApi.addDocument(session.accessToken, id, {
      name: documentName.trim(),
      status: documentStatus,
      ...(fileReference.trim() ? { fileReference: fileReference.trim() } : {}),
    }))) {
      setDocumentName('');
      setFileReference('');
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a file to upload.');
      return;
    }
    if (await act(() => backendApi.uploadDocument(session.accessToken, id, formData))) {
      form.reset();
    }
  }

  async function downloadDocument(documentId: string, name: string) {
    try {
      const blob = await backendApi.downloadDocument(session.accessToken, id, documentId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not download the document.');
    }
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
          {session.roles.includes('ROLE_ADMINISTRATOR') && <form className="case-action" onSubmit={(event) => { event.preventDefault(); void act(() => backendApi.assignReviewer(session.accessToken, id, reviewerSubject.trim() || null)); }}>
            <p className="form-section-title">Reviewer assignment</p>
            <label className="form-field">Reviewer subject<input maxLength={255} value={reviewerSubject} onChange={(event) => setReviewerSubject(event.target.value)} placeholder="Leave blank to clear assignment" /></label>
            <button className="btn btn-outline" type="submit" disabled={busy}>Save reviewer</button>
          </form>}
          {canIntake && <form className="case-action" onSubmit={addDocument}>
            <p className="form-section-title">Add document record</p>
            <label className="form-field">Document name<input required maxLength={255} value={documentName} onChange={(event) => setDocumentName(event.target.value)} /></label>
            <div className="form-grid">
              <label className="form-field">Status<select value={documentStatus} onChange={(event) => setDocumentStatus(event.target.value)}>{['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'].map((value) => <option value={value} key={value}>{formatStage(value)}</option>)}</select></label>
              <label className="form-field">Storage reference <span className="field-note">Optional opaque reference</span><input maxLength={256} pattern="[A-Za-z0-9_-]+" value={fileReference} onChange={(event) => setFileReference(event.target.value)} /></label>
            </div>
            <button className="btn btn-outline" type="submit" disabled={busy}><Send size={14} />Add document</button>
          </form>}
          {canIntake && <form className="case-action" onSubmit={(event) => void uploadDocument(event)}>
            <p className="form-section-title">Upload a supporting file</p>
            <label className="form-field">Document name<input name="name" required maxLength={255} /></label>
            <label className="form-field">Status<select name="status" defaultValue="SUBMITTED">{['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'].map((value) => <option value={value} key={value}>{formatStage(value)}</option>)}</select></label>
            <label className="form-field">File<input name="file" type="file" required /></label>
            <p className="field-note">Upload is available when backend object storage is configured.</p>
            <button className="btn btn-outline" type="submit" disabled={busy}><ArrowDownToLine size={14} />Upload file</button>
          </form>}
        </section>
        <aside className="detail-side">
          {canTransition && allowedStages.length > 0 && <form className="live-panel case-transition" onSubmit={transition}>
            <div className="live-panel-heading"><div><p className="eyebrow">WORKFLOW</p><h2>Next stage</h2></div></div>
            <label className="form-field">Move case to<select value={nextStage} onChange={(event) => setNextStage(event.target.value)}>{allowedStages.map((stage) => <option key={stage} value={stage}>{formatStage(stage)}</option>)}</select></label>
            <label className="form-field">Note <span className="field-note">Optional</span><textarea rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="btn btn-primary" type="submit" disabled={busy || !nextStage}>{busy ? <LoaderCircle size={14} className="spin" /> : <Workflow size={14} />}Update case stage</button>
          </form>}
          {canTransition && caseFile.capabilities.saveOutcome.enabled && <form className="live-panel case-transition" onSubmit={saveOutcome}>
            <div className="live-panel-heading"><div><p className="eyebrow">DECISION</p><h2>Case outcome</h2></div></div>
            <label className="form-field">Decision<input maxLength={120} value={outcomeDecision} onChange={(event) => setOutcomeDecision(event.target.value)} /></label>
            <label className="form-field">Outcome note<textarea rows={3} maxLength={5000} value={outcomeNote} onChange={(event) => setOutcomeNote(event.target.value)} /></label>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <Workflow size={14} />}Save outcome</button>
          </form>}
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">CASE HISTORY</p><h2>Stage history</h2></div></div>
            {caseFile.stageHistory.length ? <ol className="history-list">{caseFile.stageHistory.map((entry) => <li key={`${entry.changedAt}-${entry.toStage}`}><span className="history-dot" /><b>{formatStage(entry.toStage)}</b><small>{entry.changedBy} · {formatDate(entry.changedAt)}</small>{entry.note && <p>{entry.note}</p>}</li>)}</ol> : <p className="live-empty">No stage changes recorded yet.</p>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">SUPPORTING FILES</p><h2>Documents</h2></div></div>
            {caseFile.documents.length ? <ul className="document-list">{caseFile.documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)} · {formatDate(document.createdAt)}</small></span>
              <div className="document-actions">
                {canIntake && document.fileReference && <button className="icon-button" disabled={busy} onClick={() => void downloadDocument(document.id, document.originalFilename || document.name)} aria-label={`Download ${document.name}`}><ArrowDownToLine size={15} /></button>}
                {canTransition && caseFile.capabilities.updateDocumentStatus.enabled && <select aria-label={`Update ${document.name} status`} value={document.status} disabled={busy} onChange={(event) => void act(() => backendApi.updateDocumentStatus(session.accessToken, id, document.id, { status: event.target.value, version: submission.version }))}>{['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'].map((value) => <option key={value} value={value}>{formatStage(value)}</option>)}</select>}
              </div>
            </li>)}</ul> : <p className="live-empty">No documents have been added to this case.</p>}
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

function asIntakeCaseFile(value: Awaited<ReturnType<typeof backendApi.submissionCaseFile>>): CaseFile {
  return {
    submission: value.submission,
    currentStage: value.submission.stage,
    reference: value.submission.code,
    documents: value.documents,
    stageHistory: value.stageHistory,
    stepper: [],
    outcome: null,
    capabilities: {
      nextStep: { enabled: false, reason: null },
      saveOutcome: { enabled: false, reason: null },
      updateDocumentStatus: { enabled: false, reason: null },
    },
    transitionOptions: { allowedTransitions: [] },
  };
}
