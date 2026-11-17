import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Eye,
  Trash2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STEPS = ['Type', 'Details', 'Documents', 'Department rules', 'Check & submit'];
const STEP_COPY = [
  ['Choose your path', 'Start with the type of idea you want to share.'],
  ['Tell us about it', 'A little context helps the team understand your idea.'],
  ['Bring it to life', 'Add the brief and any supporting material you have.'],
  ['A quick agreement', 'Review the guidelines before sending your idea.'],
  ['Ready for take-off', 'Give everything one last look before you submit.'],
];

function documentRequirementsFor(category, recommendationLetterStatus) {
  const requirements = [
    { id: 'brief', label: 'Project brief or description document', documentType: 'PROJECT_BRIEF', required: true },
    { id: 'evidence', label: 'Supporting evidence (data, photos, reports)', documentType: 'SUPPORTING_EVIDENCE', required: false },
  ];
  if (category === 'student' && recommendationLetterStatus !== 'not_required') {
    requirements.push({ id: 'recommendation', label: 'Recommendation letter', documentType: 'RECOMMENDATION_LETTER', required: true });
  }
  return requirements;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_DOCUMENT_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,.svg,.dxf,.dwg,.stl';

/**
 * Optional props for Reception's assisted (walk-in) submission (Assignment 3).
 * Without them this page behaves exactly as before.
 * - onBehalfOf: { submitterId, name, email } - shows a banner, fills in and locks Submitter ID
 * - confirmationPath / cancelPath: where to go after submitting / on cancel
 */
export function NewSubmissionPage({
  token,
  onUnauthorized,
  isSubmitter = false,
  onBehalfOf = null,
  confirmationPath = '/submissions/new/confirmation',
  cancelPath = '/submissions',
}) {
  const navigate = useNavigate();
  const effectiveCancelPath = isSubmitter ? '/my-submissions' : cancelPath;
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('student');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [problemAddressed, setProblemAddressed] = useState('');
  const [submitterId, setSubmitterId] = useState(onBehalfOf?.submitterId ?? '');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [recommendationLetterStatus, setRecommendationLetterStatus] = useState('submitted');
  const [documentFiles, setDocumentFiles] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [attemptedAdvance, setAttemptedAdvance] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const documentRequirements = useMemo(
    () => documentRequirementsFor(category, recommendationLetterStatus),
    [category, recommendationLetterStatus],
  );

  useEffect(() => {
    if (!previewFile) return undefined;
    return () => URL.revokeObjectURL(previewFile.url);
  }, [previewFile]);

  const detailsValid = Boolean(
    title.trim() && purpose.trim() && problemAddressed.trim() &&
    (category !== 'student' || (studentNumber.trim() && programme.trim())),
  );
  const documentsValid = documentRequirements.every(
    (requirement) => !requirement.required || documentFiles[requirement.id] instanceof File,
  );
  const stepValid = [true, detailsValid, documentsValid, rulesAccepted, true][step];

  function setDocumentFile(id, file) {
    setDocumentFiles((current) => ({ ...current, [id]: file ?? null }));
  }

  function openFilePreview(file) {
    setPreviewFile({ file, url: URL.createObjectURL(file) });
  }

  function closeFilePreview() {
    setPreviewFile(null);
  }

  function goNext() {
    setAttemptedAdvance(true);
    if (!stepValid) return;
    setAttemptedAdvance(false);
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
  }

  function goBack() {
    setAttemptedAdvance(false);
    setStep((value) => Math.max(0, value - 1));
  }

  async function submit() {
    if (!rulesAccepted || !detailsValid || !documentsValid) {
      setAttemptedAdvance(true);
      return;
    }
    setError('');
    setBusy(true);
    const body = {
      category,
      title: title.trim(),
      purpose: purpose.trim(),
      problemAddressed: problemAddressed.trim(),
      ...(!isSubmitter && submitterId.trim() ? { submitterId: submitterId.trim() } : {}),
      ...(category === 'student'
        ? {
            studentNumber: studentNumber.trim(),
            programme: programme.trim(),
            supervisor: supervisor.trim(),
            recommendationLetterStatus,
          }
        : {}),
    };

    try {
      const created = await backendApi.createSubmission(token, body);
      for (const requirement of documentRequirements) {
        const file = documentFiles[requirement.id];
        if (!(file instanceof File)) continue;
        const formData = new FormData();
        formData.set('name', requirement.label);
        formData.set('status', 'SUBMITTED');
        formData.set('documentType', requirement.documentType);
        formData.set('file', file);
        await backendApi.uploadDocument(token, created.id, formData);
      }
      const submission = isSubmitter
        ? await backendApi.submitSubmission(token, created.id)
        : created;
      navigate(confirmationPath, { state: { submission, onBehalfOf } });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not create the submission.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-page page-enter">
      <Link to={onBehalfOf ? cancelPath : effectiveCancelPath} className="back-link"><ArrowLeft size={15} />{onBehalfOf ? 'Back to reception home' : isSubmitter ? 'Back to my submissions' : 'Back to submissions'}</Link>
      <div className="live-page-heading compact-heading submission-page-heading">
        <div>
          <p className="eyebrow">{isSubmitter ? 'YOUR NEXT BIG IDEA STARTS HERE' : 'INTAKE · NEW CASE'}</p>
          <h1>{isSubmitter ? 'Submit your idea.' : 'Register an idea.'}</h1>
          <p>{isSubmitter ? 'Share what you’re building. We’ll help you take it further.' : 'Create a draft record in the live MUTIC ERP database.'}</p>
        </div>
        <span className="submission-time-badge"><Clock3 size={15} /> About 5 minutes</span>
      </div>
      {onBehalfOf && (
        <section className="live-panel" role="status" aria-label="Submitting on behalf of">
          <p className="eyebrow">ASSISTED SUBMISSION</p>
          <p>Submitting on behalf of <b>{onBehalfOf.name}</b> ({onBehalfOf.email}). They stay the owner of this brief; you are recorded as assisting.</p>
        </section>
      )}
      <div className={`submission-create-layout ${isSubmitter ? 'is-self-service' : ''}`}>
      <form className="live-panel create-form submission-create-form" onSubmit={(event) => event.preventDefault()}>
        <header className="submission-form-header">
          <div>
            <p className="eyebrow">STEP {String(step + 1).padStart(2, '0')} OF {String(STEPS.length).padStart(2, '0')}</p>
            <h2>{STEP_COPY[step][0]}</h2>
            <p>{step === 1 && isSubmitter
              ? 'Fields marked * are required. Supervisor details can be added if your idea advances.'
              : STEP_COPY[step][1]}</p>
          </div>
          <span className="submission-step-number">{String(step + 1).padStart(2, '0')}<i>/{String(STEPS.length).padStart(2, '0')}</i></span>
        </header>
        <ol className="submission-stepper" aria-label="Submission progress">
          {STEPS.map((item, index) => (
            <li
              key={item}
              className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
              <small>{item}</small>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="form-section">
            <div className="category-options">
              <label className={`category-option ${category === 'student' ? 'selected' : ''}`}>
                <input type="radio" name="category" value="student" checked={category === 'student'} onChange={() => setCategory('student')} />
                <span className="category-option-icon"><GraduationCap size={19} aria-hidden="true" /></span>
                <span className="category-option-copy"><b>Student project</b><small>Student-led work submitted through a programme or supervisor.</small></span>
                <span className="category-option-check"><Check size={13} aria-hidden="true" /></span>
              </label>
              <label className={`category-option ${category === 'general' ? 'selected' : ''}`}>
                <input type="radio" name="category" value="general" checked={category === 'general'} onChange={() => setCategory('general')} />
                <span className="category-option-icon"><Lightbulb size={19} aria-hidden="true" /></span>
                <span className="category-option-copy"><b>General innovation</b><small>Ideas and projects from the wider university community.</small></span>
                <span className="category-option-check"><Check size={13} aria-hidden="true" /></span>
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-section">
            <label className="form-field"><span className="submission-field-label">Project title <span className="submission-required-mark" aria-label="required">*</span></span><input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give the project a clear, concise title" /></label>
            <label className="form-field"><span className="submission-field-label">Purpose <span className="submission-required-mark" aria-label="required">*</span></span><textarea required maxLength={5000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="What does this project aim to achieve?" /></label>
            <label className="form-field"><span className="submission-field-label">Problem addressed <span className="submission-required-mark" aria-label="required">*</span></span><textarea required maxLength={5000} rows={3} value={problemAddressed} onChange={(event) => setProblemAddressed(event.target.value)} placeholder="What problem or need does it respond to?" /></label>
            {!isSubmitter && <label className="form-field">Submitter ID <span className="field-note">Optional; use an existing account identifier when linking an account.</span><input maxLength={255} value={submitterId} readOnly={Boolean(onBehalfOf)} onChange={(event) => setSubmitterId(event.target.value)} /></label>}
            {category === 'student' && (
              <>
                <div className="form-grid">
                  <label className="form-field"><span className="submission-field-label">Student number <span className="submission-required-mark" aria-label="required">*</span></span><input required maxLength={80} value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} /></label>
                  <label className="form-field"><span className="submission-field-label">Programme <span className="submission-required-mark" aria-label="required">*</span></span><input required maxLength={200} value={programme} onChange={(event) => setProgramme(event.target.value)} /></label>
                </div>
                <div className="form-grid">
                  {!isSubmitter && <label className="form-field"><span className="submission-field-label">Supervisor</span><span className="field-note">Optional; can be added later.</span><input maxLength={255} value={supervisor} onChange={(event) => setSupervisor(event.target.value)} /></label>}
                  <div className="form-field">
                    <span id="recommendation-letter-status-label">Recommendation letter status <span className="submission-required-mark" aria-label="required">*</span></span>
                    <Select value={recommendationLetterStatus} onValueChange={setRecommendationLetterStatus}>
                      <SelectTrigger aria-labelledby="recommendation-letter-status-label" className="submission-form-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="submission-form-select-content" sideOffset={6}>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        {!isSubmitter && <SelectItem value="verified">Verified</SelectItem>}
                        <SelectItem value="one_file">One file</SelectItem>
                        <SelectItem value="not_required">Not required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            {attemptedAdvance && !detailsValid && <p className="api-error" role="alert">Fill in every required field before continuing.</p>}
          </div>
        )}

        {step === 2 && (
          <div className="form-section">
            <p className="submission-document-intro"><FileText size={17} /> Upload each required file from your device. PDF, Office, image and common design files are supported (up to 15 MB per file).</p>
            {documentRequirements.map((requirement) => (
              <div className="form-field" key={requirement.id}>
                <span className="submission-field-label">
                  {requirement.label}{' '}
                  {requirement.required
                    ? <span className="submission-required-mark" aria-label="required">*</span>
                    : <span className="field-note">Optional</span>}
                </span>
                <div className={`submission-upload-card ${documentFiles[requirement.id] ? 'has-file' : ''}`}>
                  <input
                    id={`submission-file-${requirement.id}`}
                    className="submission-file-input"
                    type="file"
                    accept={ACCEPTED_DOCUMENT_TYPES}
                    required={requirement.required}
                    aria-label={`Upload ${requirement.label}`}
                    onChange={(event) => {
                      setDocumentFile(requirement.id, event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <span className="submission-upload-icon"><Upload size={17} /></span>
                  <span className="submission-upload-copy">
                    <b>{documentFiles[requirement.id]?.name || 'Choose a file to upload'}</b>
                    <small>{documentFiles[requirement.id]
                      ? formatFileSize(documentFiles[requirement.id].size)
                      : 'Select from your device · PDF, DOCX, image and more'}</small>
                  </span>
                  <label className="submission-upload-action" htmlFor={`submission-file-${requirement.id}`}>
                    {documentFiles[requirement.id] ? 'Change file' : 'Browse files'}
                  </label>
                  {documentFiles[requirement.id] && (
                    <div className="submission-file-actions">
                      <button type="button" className="submission-file-action" onClick={() => openFilePreview(documentFiles[requirement.id])} aria-label={`Preview ${documentFiles[requirement.id].name}`}><Eye size={14} />Preview</button>
                      <button type="button" className="submission-file-action is-remove" onClick={() => setDocumentFile(requirement.id, null)} aria-label={`Remove ${documentFiles[requirement.id].name}`}><Trash2 size={14} />Remove</button>
                    </div>
                  )}
                </div>
                {attemptedAdvance && requirement.required && !(documentFiles[requirement.id] instanceof File) && (
                  <span className="api-error" role="alert" style={{ marginTop: 4 }}>Upload this required document to continue.</span>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="form-section">
            <p className="field-note" style={{ marginBottom: 10 }}>
              General UniPod rules apply to every submission: work must be original or properly attributed, submissions must not infringe
              existing intellectual property, and all participants must engage in good faith with the review process. Department-specific
              rules aren't published yet — they will show here once the department rules manager (Assignment 12) ships, and will override
              general rules where the two differ.
            </p>
            <label className="management-checkbox">
              <input type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)} />
              I have read and accept the UniPod general rules for this submission.
            </label>
            {attemptedAdvance && !rulesAccepted && <p className="api-error" role="alert">You must accept the rules before continuing.</p>}
          </div>
        )}

        {step === 4 && (
          <div className="form-section">
            <div className="case-fields">
              <SummaryField label="Type" value={category === 'student' ? 'Student project' : 'General innovation'} />
              <SummaryField label="Title" value={title} />
              <SummaryField label="Purpose" value={purpose} />
              <SummaryField label="Problem addressed" value={problemAddressed} />
              {category === 'student' && <SummaryField label="Student number / programme" value={`${studentNumber} · ${programme}`} />}
              {category === 'student' && !isSubmitter && supervisor.trim() && <SummaryField label="Supervisor" value={supervisor} />}
              <SummaryField
                label="Documents"
                value={documentRequirements.map((requirement) => `${requirement.label}: ${documentFiles[requirement.id]?.name || 'not provided'}`).join('; ')}
              />
              <SummaryField label="Department rules" value={rulesAccepted ? 'Accepted' : 'Not yet accepted'} />
            </div>
          </div>
        )}

        {error && <div className="api-error api-error-banner" role="alert">{error}</div>}
        <div className="form-actions">
          {step > 0 && <button className="btn btn-outline" type="button" onClick={goBack} disabled={busy}>Back</button>}
          {step === 0 && <Link to={onBehalfOf ? cancelPath : effectiveCancelPath} className="btn btn-outline">Cancel</Link>}
          {step < STEPS.length - 1
            ? <button className="btn btn-primary" type="button" onClick={goNext}>Next<ArrowRight size={15} /></button>
            : <button className="btn btn-primary" type="button" onClick={submit} disabled={busy || !rulesAccepted}>
                {busy ? <LoaderCircle size={15} className="spin" /> : null}
                {busy ? (isSubmitter ? 'Submitting brief…' : 'Saving draft…') : (isSubmitter ? 'Submit brief' : 'Create draft')}
                {!busy && <ArrowRight size={15} />}
              </button>}
        </div>
      </form>
      {isSubmitter && (
        <aside className="submission-guide">
          <span className="submission-guide-icon"><Lightbulb size={20} /></span>
          <p className="eyebrow">WHAT HAPPENS NEXT</p>
          <h2>Your idea has room to grow.</h2>
          <p>Once you submit, the UniPod team will check your brief and guide it through the review process.</p>
          <div className="submission-guide-steps">
            <span><i>01</i><b>Completeness check</b><small>Reception reviews your brief.</small></span>
            <span><i>02</i><b>Fact-finding</b><small>Your idea gets a closer look.</small></span>
            <span><i>03</i><b>Stay in the loop</b><small>Track updates in My Submissions.</small></span>
          </div>
          <div className="submission-guide-note"><ShieldCheck size={16} /><span>Your brief is connected to your account, so you can follow its progress.</span></div>
        </aside>
      )}
      </div>
      {previewFile && (
        <div className="submission-preview-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeFilePreview();
        }}>
          <section className="submission-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="submission-preview-title">
            <header>
              <div><p className="eyebrow">DOCUMENT PREVIEW</p><h2 id="submission-preview-title">{previewFile.file.name}</h2></div>
              <button type="button" className="submission-preview-close" aria-label="Close preview" onClick={closeFilePreview}><X size={18} /></button>
            </header>
            {previewFile.file.type.startsWith('image/')
              ? <img className="submission-preview-image" src={previewFile.url} alt={`Preview of ${previewFile.file.name}`} />
              : previewFile.file.type === 'application/pdf' || previewFile.file.name.toLowerCase().endsWith('.pdf')
                ? <iframe className="submission-preview-pdf" title={`Preview of ${previewFile.file.name}`} src={previewFile.url} />
                : <div className="submission-preview-unavailable"><FileText size={28} /><p>Inline preview isn’t available for this file type.</p><span>{formatFileSize(previewFile.file.size)} · You can still upload or remove it.</span></div>}
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryField({ label, value }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
