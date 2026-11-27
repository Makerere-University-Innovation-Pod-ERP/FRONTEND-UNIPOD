import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, CircleAlert, Copy, LoaderCircle, RefreshCw, Send, Workflow } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INTAKE_ROLES = ['ROLE_ADMINISTRATOR', 'ROLE_INNOVATION_COORDINATOR', 'ROLE_RECEPTIONIST', 'ROLE_FACT_FINDING_OFFICER'];
const TRANSITION_ROLES = ['ROLE_ADMINISTRATOR', 'ROLE_INNOVATION_COORDINATOR'];

export function SubmissionDetailPage({
  session,
  onUnauthorized,
}) {
  const { id = '' } = useParams();
  const [caseFile, setCaseFile] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [allowedStages, setAllowedStages] = useState([]);
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
  const isSubmitterViewer = session.roles.includes('ROLE_SUBMITTER');
  const backHref = isSubmitterViewer ? '/my-submissions' : '/submissions';
  const backLabel = isSubmitterViewer ? 'Back to my submissions' : 'Back to submissions';

  const load = useCallback(async (signal) => {
    try {
      // A submitter's own brief page is a dedicated endpoint (§5.4), not the
      // shared staff case-file aggregate every other role here reads.
      const current = isReceptionist
        ? asIntakeCaseFile(await backendApi.submissionCaseFile(session.accessToken, id, signal))
        : isSubmitterViewer
          ? await backendApi.submitterSubmissionDetail(session.accessToken, id, signal)
          : await backendApi.caseFile(session.accessToken, id, signal);
      setCaseFile(current);
      setReviewerSubject(current.submission.assignedReviewerSubject || '');
      setOutcomeDecision(current.outcome?.decision || '');
      setOutcomeNote(current.outcome?.note || '');
      const tasks = [];
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
  }, [session.accessToken, id, canIntake, canTransition, isReceptionist, isSubmitterViewer, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function act(action) {
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

  async function transition(event) {
    event.preventDefault();
    if (!caseFile || !nextStage) return;
    if (await act(() => backendApi.transition(session.accessToken, id, {
      to_stage: nextStage,
      note: note.trim(),
      version: caseFile.submission.version,
    }))) setNote('');
  }

  async function saveOutcome(event) {
    event.preventDefault();
    if (!caseFile) return;
    await act(() => backendApi.saveOutcome(session.accessToken, id, {
      decision: outcomeDecision.trim(),
      note: outcomeNote.trim(),
      version: caseFile.submission.version,
    }));
  }

  async function addDocument(event) {
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

  async function uploadDocument(event) {
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

  async function downloadDocument(documentId, name) {
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

  if (loading && !caseFile) return <div className="live-page"><LoadingSkeleton label="Loading case file…" variant="detail" /></div>;
  if (!caseFile) return <div className="live-page"><Link to={backHref} className="back-link"><ArrowLeft size={15} />{backLabel}</Link>{error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}</div>;

  const submission = caseFile.submission;
  const caseReference = caseFile.reference || submission.code || 'DRAFT';
  const categoryLabel = submission.category === 'student' ? 'Student project' : 'General innovation';
  const receivedLabel = submission.receivedAt
    ? `Received ${formatDate(submission.receivedAt)}`
    : 'Awaiting intake';
  const reviewerTeam = Array.isArray(caseFile.reviewPanel?.reviewerTeam)
    ? caseFile.reviewPanel.reviewerTeam
    : [];
  const ipPanel = Array.isArray(caseFile.reviewPanel?.ipPanel)
    ? caseFile.reviewPanel.ipPanel
    : null;
  const normalizedSteps = caseFile.stepper.map((step) => ({
    ...step,
    normalizedState: String(step.state || '').toUpperCase(),
  }));
  const completedStepCount = normalizedSteps.filter((step) => step.normalizedState === 'COMPLETE').length;
  const nextStepIndex = normalizedSteps.findIndex((step) => ['UPCOMING', 'PENDING'].includes(step.normalizedState));
  return (
    <div className="live-page page-enter case-detail-page">
      <Link to={backHref} className="back-link case-detail-back-link"><ArrowLeft size={15} />{backLabel}</Link>
      <header className="case-hero">
        <div className="case-hero-copy">
          <p className="case-hero-kicker"><span />CASE FILE <i>{caseReference}</i></p>
          <h1>{submission.title}</h1>
          {submission.purpose && <p className="case-hero-description">{submission.purpose}</p>}
        </div>
        <div className="case-hero-actions">
          <div className="case-hero-meta">
            <span>{categoryLabel}</span>
            <span>{receivedLabel}</span>
          </div>
          <span className={`stage-pill stage-${submission.stage.toLowerCase()}`}>{formatStage(submission.stage)}</span>
          {(caseFile.reference || submission.code) && <button className="btn btn-outline" onClick={async () => {
            try {
              await navigator.clipboard.writeText(caseReference);
            } catch {
              setError('Could not copy the reference. Copy it directly from the case heading.');
            }
          }}><Copy size={14} />Copy reference</button>}
        </div>
        <span className="case-hero-decoration" aria-hidden="true" />
      </header>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      {submission.stage === 'REFINEMENT_REQUESTED' && isSubmitterViewer && (
        <section className="live-panel capability-notice" aria-label="Open request">
          <p className="eyebrow">OPEN REQUEST</p>
          <p className="capability-summary">The reviewer has asked for changes before this brief can continue.</p>
          <div className="form-actions" style={{ justifyContent: 'flex-start', padding: '10px 0 0' }}>
            <Link className="btn btn-primary" to={`/submissions/${id}/respond`}><Send size={14} />Respond to this request</Link>
          </div>
        </section>
      )}
      {caseFile.stepper.length > 0 && <section className="live-panel case-stepper case-pipeline" aria-label="Pipeline progress">
        <div className="case-pipeline-heading">
          <div>
            <p className="eyebrow">PIPELINE PROGRESS</p>
            <h2>Your idea, in motion</h2>
            <p>Every milestone, from first review to what comes next.</p>
          </div>
          <div className="case-pipeline-current">
            <small>Current stage</small>
            <strong>{formatStage(submission.stage)}</strong>
            <span>{completedStepCount} of {caseFile.stepper.length} milestones complete</span>
          </div>
        </div>
        <div className="case-journey-scroll" tabIndex={0} aria-label="Pipeline stages">
          <ol className="case-journey" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${normalizedSteps.length}, minmax(0, 1fr))`,
            width: '100%',
            minWidth: 0,
          }}>{normalizedSteps.map((step, index) => <li className={`step-${step.normalizedState.toLowerCase()} ${index === nextStepIndex ? 'step-next' : ''}`} key={step.stage} aria-current={step.normalizedState === 'CURRENT' ? 'step' : undefined}>
            <span className="case-journey-node">{step.normalizedState === 'COMPLETE' ? '✓' : String(index + 1).padStart(2, '0')}</span>
            <div className="case-journey-copy">
              <b>{formatStage(step.stage)}</b>
              <span>{step.normalizedState === 'COMPLETE' ? 'Completed' : step.normalizedState === 'CURRENT' ? 'In progress' : index === nextStepIndex ? 'Up next' : 'Upcoming'}</span>
            </div>
          </li>)}</ol>
        </div>
      </section>}
      <div className="detail-grid">
        <section className="live-panel case-summary">
          <div className="live-panel-heading"><div><p className="eyebrow">THE IDEA</p><h2>Project summary</h2></div><button className="icon-button" onClick={() => { setError(''); setLoading(true); void load(); }} aria-label="Refresh case"><RefreshCw size={15} /></button></div>
          <div className="case-fields">
            <section className="case-summary-section">
              <p className="case-summary-heading">Project overview</p>
              <div className="case-summary-two-column">
                <Field label="Purpose" value={submission.purpose} />
                <Field label="Problem addressed" value={submission.problemAddressed} />
              </div>
            </section>
            <section className="case-summary-section">
              <p className="case-summary-heading">Registration</p>
              <div className="case-summary-two-column">
                <Field label="Registered by" value={submission.registeredBy} />
                <Field label="Receiving officer" value={submission.receivingOfficer || 'Not assigned'} />
                <Field label="Submitter ID" value={submission.submitterId || 'Not linked'} />
              </div>
            </section>
            {submission.category === 'student' && (
              <section className="case-summary-section">
                <p className="case-summary-heading">Student details</p>
                <div className="case-summary-three-column">
                  <Field label="Student number" value={submission.studentNumber || '—'} />
                  <Field label="Programme" value={submission.programme || '—'} />
                  <Field label="Supervisor" value={submission.supervisor || '—'} />
                </div>
              </section>
            )}
            <section className="case-summary-section">
              <p className="case-summary-heading">Assignment</p>
              <div className="case-summary-two-column">
                <Field label="Responsible sector" value={submission.responsibleSectorName || 'Not assigned'} />
                <Field label="Recommendation letter" value={submission.recommendationLetterStatus ? formatStage(submission.recommendationLetterStatus) : '—'} />
              </div>
              {submission.responsibleSectorWhatsapp && (
                <p className="live-note">
                  <a href={`https://wa.me/${submission.responsibleSectorWhatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                    Message {submission.responsibleSectorName} on WhatsApp
                  </a>
                </p>
              )}
            </section>
          </div>
          {canIntake && submission.stage === 'DRAFT' && <div className="case-action">
            <p className="form-section-title">Draft actions</p>
            <div className="action-row"><button className="btn btn-primary" disabled={busy} onClick={() => void act(() => backendApi.register(session.accessToken, id))}><Workflow size={15} />Register as received</button></div>
          </div>}
          {canIntake && submission.stage === 'RECEIVED' && <form className="case-action" onSubmit={(event) => { event.preventDefault(); if (sectorId) void act(() => backendApi.forward(session.accessToken, id, sectorId)); }}>
            <p className="form-section-title">Assign to a sector</p>
            <div className="action-row">
              <Select value={sectorId} onValueChange={setSectorId} required>
                <SelectTrigger aria-label="Select an active sector" className="submission-detail-select-trigger action-row-select-trigger">
                  <SelectValue placeholder="Select an active sector" />
                </SelectTrigger>
                <SelectContent className="submission-select-content submission-detail-select-content" sideOffset={6}>
                  {sectors.map((sector) => <SelectItem value={sector.id} key={sector.id}>{sector.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <button className="btn btn-primary" disabled={busy || !sectors.length}><Send size={14} />Forward</button>
            </div>
          </form>}
          {session.roles.includes('ROLE_ADMINISTRATOR') && <form className="case-action" onSubmit={(event) => { event.preventDefault(); void act(() => backendApi.assignReviewer(session.accessToken, id, reviewerSubject.trim() || null)); }}>
            <p className="form-section-title">Reviewer assignment</p>
            <label className="form-field">Reviewer subject<input maxLength={255} value={reviewerSubject} onChange={(event) => setReviewerSubject(event.target.value)} placeholder="Leave blank to clear assignment" /></label>
            <button className="btn btn-outline" type="submit" disabled={busy}>Save reviewer</button>
          </form>}
          {canIntake && <form className="case-action document-action" onSubmit={addDocument}>
            <p className="form-section-title">Add document record</p>
            <label className="form-field">Document name<input required maxLength={255} value={documentName} onChange={(event) => setDocumentName(event.target.value)} /></label>
            <div className="form-grid">
              <div className="form-field">
                <span>Status</span>
                <Select value={documentStatus} onValueChange={setDocumentStatus}>
                  <SelectTrigger aria-label="Status" className="submission-detail-select-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent className="submission-select-content submission-detail-select-content" sideOffset={6}>
                    {['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'].map((value) => <SelectItem value={value} key={value}>{formatStage(value)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="form-field">Storage reference <span className="field-note">Optional opaque reference</span><input maxLength={256} pattern="[A-Za-z0-9_-]+" value={fileReference} onChange={(event) => setFileReference(event.target.value)} /></label>
            </div>
            <button className="btn btn-outline" type="submit" disabled={busy}><Send size={14} />Add document</button>
          </form>}
          {canIntake && <form className="case-action document-action" onSubmit={(event) => void uploadDocument(event)}>
            <p className="form-section-title">Upload a supporting file</p>
            <label className="form-field">Document name<input name="name" required maxLength={255} /></label>
            <div className="form-field">
              <span>Status</span>
              <Select name="status" defaultValue="SUBMITTED">
                <SelectTrigger aria-label="Status" className="submission-detail-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="submission-select-content submission-detail-select-content" sideOffset={6}>
                  {['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'].map((value) => <SelectItem value={value} key={value}>{formatStage(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="form-field">File<input name="file" type="file" required /></label>
            <p className="field-note">Upload is available when backend object storage is configured.</p>
            <button className="btn btn-outline" type="submit" disabled={busy}><ArrowDownToLine size={14} />Upload file</button>
          </form>}
        </section>
        <aside className="detail-side">
          {canTransition && allowedStages.length > 0 && <form className="live-panel case-transition" onSubmit={transition}>
            <div className="live-panel-heading"><div><p className="eyebrow">WORKFLOW</p><h2>Next stage</h2></div></div>
            <div className="form-field">
              <span>Move case to</span>
              <Select value={nextStage} onValueChange={setNextStage}>
                <SelectTrigger aria-label="Move case to" className="submission-detail-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="submission-select-content submission-detail-select-content" sideOffset={6}>
                  {allowedStages.map((stage) => <SelectItem key={stage} value={stage}>{formatStage(stage)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="form-field">Note <span className="field-note">Optional</span><textarea rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="btn btn-primary" type="submit" disabled={busy || !nextStage}>{busy ? <LoaderCircle size={14} className="spin" /> : <Workflow size={14} />}Update case stage</button>
          </form>}
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">DECISION</p><h2>Case outcome</h2></div></div>
            {caseFile.outcome && <div className="outcome-summary">
              <Field label="Status" value={formatStage(caseFile.outcome.status)} />
              {caseFile.outcome.decision && <Field label="Decision" value={caseFile.outcome.decision} />}
              {caseFile.outcome.note && <Field label="Note" value={caseFile.outcome.note} />}
              {caseFile.outcome.decidedBy && <Field label="Decided by" value={caseFile.outcome.decidedBy} />}
              {caseFile.outcome.decidedAt && <Field label="Decision date" value={formatDate(caseFile.outcome.decidedAt)} />}
            </div>}
            {canTransition && caseFile.capabilities.saveOutcome.enabled && <form className="case-transition outcome-form" onSubmit={saveOutcome}>
              <label className="form-field">Decision<input maxLength={120} value={outcomeDecision} onChange={(event) => setOutcomeDecision(event.target.value)} /></label>
              <label className="form-field">Outcome note<textarea rows={3} maxLength={5000} value={outcomeNote} onChange={(event) => setOutcomeNote(event.target.value)} /></label>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <Workflow size={14} />}Save outcome</button>
            </form>}
          </section>
          {caseFile.reviewPanel && <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">REVIEW PANEL</p><h2>Reviewers & IP</h2></div></div>
            {caseFile.reviewPanel.availability === 'AVAILABLE' ? <>
              <Field label="Reviewer quorum" value={caseFile.reviewPanel.quorumMet ? 'Met' : caseFile.reviewPanel.quorumAvailable ? 'Not met' : 'Unavailable'} />
              <Field label="Reviewer team" value={reviewerTeam.join(', ') || 'No reviewers assigned'} />
              {ipPanel && <Field label="IP panel" value={ipPanel.join(', ') || 'No IP panel assigned'} />}
            </> : <p className="live-note">Reviewer and IP panel integration is not configured.</p>}
          </section>}
          {caseFile.activity && <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">ACTIVITY</p><h2>Case activity</h2></div></div>
            {caseFile.activity.availability === 'AVAILABLE' && caseFile.activity.items.length
              ? <ul className="activity-feed">{caseFile.activity.items.map((item, index) => <li key={`${item.occurredAt}-${index}`}><b>{item.action}</b><span>{item.summary}</span><small>{item.actor} · {formatDate(item.occurredAt)}</small></li>)}</ul>
              : <p className="live-note">Case activity integration is not configured.</p>}
          </section>}
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">CASE HISTORY</p><h2>Stage history</h2></div></div>
            {caseFile.stageHistory.length ? <ol className="history-list">{caseFile.stageHistory.map((entry) => <li key={`${entry.changedAt}-${entry.toStage}`}><span className="history-dot" /><b>{formatStage(entry.toStage)}</b><small>{entry.changedBy} · {formatDate(entry.changedAt)}</small>{entry.note && <p>{entry.note}</p>}</li>)}</ol> : <p className="live-empty">No stage changes recorded yet.</p>}
          </section>
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">SUPPORTING FILES</p><h2>Documents</h2></div></div>
            {caseFile.documents.length ? <ul className="document-list">{caseFile.documents.map((document) => <li key={document.id}><span><b>{document.name}</b><small>{formatStage(document.status)} · {formatDate(document.createdAt)}</small></span>
              <div className="document-actions">
                {canIntake && document.fileReference && <button className="icon-button" disabled={busy} onClick={() => void downloadDocument(document.id, document.originalFilename || document.name)} aria-label={`Download ${document.name}`}><ArrowDownToLine size={15} /></button>}
                {canTransition && caseFile.capabilities.updateDocumentStatus.enabled && (
                  <Select
                    value={document.status}
                    disabled={busy}
                    onValueChange={(value) => void act(() => backendApi.updateDocumentStatus(session.accessToken, id, document.id, { status: value, version: submission.version }))}
                  >
                    <SelectTrigger aria-label={`Update ${document.name} status`} className="submission-detail-select-trigger"><SelectValue /></SelectTrigger>
                    <SelectContent className="submission-select-content submission-detail-select-content" sideOffset={6}>
                      {['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'].map((value) => <SelectItem key={value} value={value}>{formatStage(value)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </li>)}</ul> : <p className="live-empty">No documents have been added to this case.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}

function asIntakeCaseFile(value) {
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
