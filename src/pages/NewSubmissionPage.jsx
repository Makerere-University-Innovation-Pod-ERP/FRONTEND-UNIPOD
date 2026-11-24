import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  FolderOpen,
  Lightbulb,
  LoaderCircle,
  Eye,
  Trash2,
  ShieldCheck,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRules } from '@/hooks/useRules';
import { allMustAcceptAccepted, computeAcceptedRulesVersion, RulesAcceptance } from '@/components/RulesAcceptance';
import { SubmissionDatePicker } from '@/components/SubmissionDatePicker';

const STEPS = ['Type', 'Details', 'Documents', 'Department rules', 'Check & submit'];
const REGISTRATION_FLOW = [
  { label: 'Submission type', note: 'Choose a pathway', step: 0 },
  { label: 'Project information', note: 'Capture the brief', step: 1 },
  { label: 'Supporting documents', note: 'Keep evidence nearby', step: 2 },
  { label: 'Review & register', note: 'Check before recording', step: 4 },
];
const STEP_COPY = [
  ['Choose your path', 'Start with the type of idea you want to share.'],
  ['Tell us about it', 'A little context helps the team understand your idea.'],
  ['Bring it to life', 'Add the brief and any supporting material you have.'],
  ['A quick agreement', 'Review the guidelines before sending your idea.'],
  ['Ready for take-off', 'Give everything one last look before you submit.'],
];

function documentRequirementsFor(category, recommendationLetterStatus) {
  if (category === 'service_request') {
    return [
      { id: 'evidence', label: 'Supporting documents', documentType: 'SUPPORTING_EVIDENCE', required: false },
    ];
  }
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

function localDateMinimum() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function localTimeMinimum(date) {
  if (date !== localDateMinimum()) return undefined;
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(11, 16);
}

function isFutureDateTime(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

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
  const queryClient = useQueryClient();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(() => (
    isSubmitter && new URLSearchParams(location.search).get('category') === 'service_request'
      ? 'service_request'
      : 'student'
  ));
  const effectiveCancelPath = isSubmitter
    ? category === 'service_request' ? '/my-submissions/service-requests' : '/my-submissions'
    : cancelPath;
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [problemAddressed, setProblemAddressed] = useState('');
  const [serviceRequested, setServiceRequested] = useState('');
  const [serviceRequester, setServiceRequester] = useState('');
  const [department, setDepartment] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [preferredAt, setPreferredAt] = useState('');
  const preferredDate = preferredAt.split('T')[0] ?? '';
  const preferredTime = preferredAt.split('T')[1] ?? '';
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [submitterId, setSubmitterId] = useState(onBehalfOf?.submitterId ?? '');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [recommendationLetterStatus, setRecommendationLetterStatus] = useState('submitted');
  const [documentFiles, setDocumentFiles] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [acceptedRuleIds, setAcceptedRuleIds] = useState([]);
  const [attemptedAdvance, setAttemptedAdvance] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const rulesQuery = useRules(token);
  const generalRules = useMemo(
    () => (rulesQuery.data ?? []).filter((rule) => rule.scope === 'GENERAL' && rule.published),
    [rulesQuery.data],
  );
  // Fail closed: rules can only be "accepted" once they've actually loaded, so a slow or
  // failed fetch can't be mistaken for "there's nothing to accept" and silently wave the step through.
  const rulesAccepted = rulesQuery.isSuccess && allMustAcceptAccepted(generalRules, acceptedRuleIds);

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
    (category !== 'student' || (studentNumber.trim() && programme.trim())) &&
    (category !== 'service_request' || (
      serviceRequested.trim() &&
      serviceRequester &&
      expectedResult.trim() &&
      isFutureDateTime(preferredAt) &&
      submitterPhone.trim()
    )),
  );
  const documentsValid = documentRequirements.every(
    (requirement) => !requirement.required || documentFiles[requirement.id] instanceof File,
  );
  const stepValid = [true, detailsValid, documentsValid, rulesAccepted, true][step];
  const isServiceRequest = category === 'service_request';
  const stepTitle = isServiceRequest && step === 1
    ? 'Shape your request'
    : isServiceRequest && step === 2
      ? 'Add supporting material'
      : STEP_COPY[step][0];
  const backLabel = onBehalfOf
    ? 'Back to reception home'
    : isSubmitter
      ? isServiceRequest ? 'Back to service requests' : 'Back to my submissions'
      : 'Back to submissions';

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
      acceptedRulesVersion: computeAcceptedRulesVersion(
        generalRules.filter((rule) => acceptedRuleIds.includes(rule.id)),
      ),
      ...(!isSubmitter && submitterId.trim() ? { submitterId: submitterId.trim() } : {}),
      ...(category === 'student'
        ? {
            studentNumber: studentNumber.trim(),
            programme: programme.trim(),
            supervisor: supervisor.trim(),
            recommendationLetterStatus,
          }
        : {}),
      ...(category === 'service_request'
        ? {
            serviceRequested: serviceRequested.trim(),
            serviceRequester,
            ...(department.trim() ? { department: department.trim() } : {}),
            expectedResult: expectedResult.trim(),
            preferredAt: new Date(preferredAt).toISOString(),
            submitterPhone: submitterPhone.trim(),
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
      if (category === 'service_request') {
        await queryClient.invalidateQueries({ queryKey: ['submitter', 'service-requests'] });
      }
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
      <Link to={onBehalfOf ? cancelPath : effectiveCancelPath} className="back-link"><ArrowLeft size={15} />{backLabel}</Link>
      <div className="live-page-heading compact-heading submission-page-heading">
        <div>
          <p className="eyebrow">{isSubmitter ? category === 'service_request' ? 'SERVICE REQUEST · SUBMITTER' : 'YOUR NEXT BIG IDEA STARTS HERE' : 'INTAKE · NEW CASE'}</p>
          <h1>{isSubmitter ? category === 'service_request' ? 'Request a UniPod service.' : 'Submit your idea.' : 'Register a submission'}</h1>
          <p>{isSubmitter ? category === 'service_request' ? 'Tell us what support you need and when you need it. We’ll connect you with the right team.' : 'Share what you’re building. We’ll help you take it further.' : 'Record a student project or innovation with a clear, accountable starting point.'}</p>
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
        <aside className="submission-process-rail" aria-label="Submission process">
          <p className="submission-process-title">A clear start<br />for good work.</p>
          <ol className="submission-rail-steps">
            {REGISTRATION_FLOW.map((item, index) => (
              <li
                key={item.label}
                className={item.step === step || (item.step === 4 && step === 3) ? 'is-current' : item.step < step ? 'is-complete' : ''}
                aria-current={item.step === step || (item.step === 4 && step === 3) ? 'step' : undefined}
              >
                <span>{item.step < step ? <Check size={15} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>
                <span className="submission-rail-copy">
                  <b>{item.label}</b>
                  <small>{item.note}</small>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      <form className="live-panel create-form submission-create-form" onSubmit={(event) => event.preventDefault()}>
        <header className="submission-form-header">
          <div>
            <p className="eyebrow">STEP {String(step + 1).padStart(2, '0')} OF {String(STEPS.length).padStart(2, '0')}</p>
            <h2>{stepTitle}</h2>
            <p>{step === 1 && isSubmitter
              ? category === 'service_request'
                ? 'Fields marked * are required. The service team will confirm availability and timing.'
                : 'Fields marked * are required. Supervisor details can be added if your idea advances.'
              : STEP_COPY[step][1]}</p>
          </div>
          <div className="submission-progress" role="progressbar" aria-label="Submission progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((step + 1) / STEPS.length) * 100)}>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
            <i><b style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></i>
          </div>
        </header>
        {step === 0 && (
          <div className="form-section">
            <div className={`category-options ${isSubmitter ? 'submission-category-options--submitter' : ''}`}>
              <label className={`category-option ${category === 'student' ? 'selected' : ''}`}>
                <input type="radio" name="category" value="student" checked={category === 'student'} onChange={() => setCategory('student')} />
                <span className="category-option-icon"><FolderOpen size={22} aria-hidden="true" /></span>
                <span className="category-option-copy"><b>Student project</b><small>Student-led work submitted through a programme or supervisor.</small></span>
                <span className="category-option-check"><Check size={13} aria-hidden="true" /></span>
                <span className="category-option-path"><small>PATHWAY 01</small><b>STUDENT PROJECT</b></span>
                <ArrowRight className="category-option-arrow" size={16} aria-hidden="true" />
              </label>
              <label className={`category-option ${category === 'general' ? 'selected' : ''}`}>
                <input type="radio" name="category" value="general" checked={category === 'general'} onChange={() => setCategory('general')} />
                <span className="category-option-icon"><Lightbulb size={19} aria-hidden="true" /></span>
                <span className="category-option-copy"><b>General innovation</b><small>Ideas and projects from the wider university community.</small></span>
                <span className="category-option-check"><Check size={13} aria-hidden="true" /></span>
                <span className="category-option-path"><small>PATHWAY 02</small><b>GENERAL INNOVATION</b></span>
                <ArrowRight className="category-option-arrow" size={16} aria-hidden="true" />
              </label>
              {isSubmitter && (
                <label className={`category-option category-option--service ${category === 'service_request' ? 'selected' : ''}`}>
                  <input type="radio" name="category" value="service_request" checked={category === 'service_request'} onChange={() => setCategory('service_request')} />
                  <span className="category-option-icon"><Wrench size={19} aria-hidden="true" /></span>
                  <span className="category-option-copy"><b>Service request</b><small>Ask for prototyping, testing, mentorship, IP support or another UniPod service.</small></span>
                  <span className="category-option-check"><Check size={13} aria-hidden="true" /></span>
                </label>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-section">
            <label className="form-field"><span className="submission-field-label">{category === 'service_request' ? 'Request title' : 'Project title'} <span className="submission-required-mark" aria-label="required">*</span></span><input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={category === 'service_request' ? 'For example, prototype a solar dryer' : 'Give the project a clear, concise title'} /></label>
            <label className="form-field"><span className="submission-field-label">{category === 'service_request' ? 'What support do you need?' : 'Purpose'} <span className="submission-required-mark" aria-label="required">*</span></span><textarea required maxLength={5000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder={category === 'service_request' ? 'Describe the service or expertise you are looking for.' : 'What does this project aim to achieve?'} /></label>
            <label className="form-field"><span className="submission-field-label">{category === 'service_request' ? 'Context or challenge' : 'Problem addressed'} <span className="submission-required-mark" aria-label="required">*</span></span><textarea required maxLength={5000} rows={3} value={problemAddressed} onChange={(event) => setProblemAddressed(event.target.value)} placeholder={category === 'service_request' ? 'What is the background, and what have you tried so far?' : 'What problem or need does it respond to?'} /></label>
            {!isSubmitter && <label className="form-field">Submitter ID <span className="field-note">Optional; use an existing account identifier when linking an account.</span><input maxLength={255} value={submitterId} readOnly={Boolean(onBehalfOf)} onChange={(event) => setSubmitterId(event.target.value)} /></label>}
            {category === 'service_request' && (
              <>
                <label className="form-field">
                  <span className="submission-field-label">Service needed <span className="submission-required-mark" aria-label="required">*</span></span>
                  <input required maxLength={255} value={serviceRequested} onChange={(event) => setServiceRequested(event.target.value)} placeholder="e.g. 3D printing, laser cutting, product testing, mentorship" />
                </label>
                <div className="form-grid">
                  <label className="form-field">
                    <span className="submission-field-label">Who is requesting this service? <span className="submission-required-mark" aria-label="required">*</span></span>
                    <Select value={serviceRequester} onValueChange={setServiceRequester} required>
                      <SelectTrigger aria-label="Who is requesting this service?" className="submission-form-select-trigger">
                        <SelectValue placeholder="Choose requester type" />
                      </SelectTrigger>
                      <SelectContent className="submission-select-content submission-form-select-content" sideOffset={6}>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="form-field">
                    <span className="submission-field-label">Department or team <span className="field-note">Optional</span></span>
                    <input maxLength={255} value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Leave blank if you’re unsure" />
                  </label>
                </div>
                <label className="form-field">
                  <span className="submission-field-label">What result are you expecting? <span className="submission-required-mark" aria-label="required">*</span></span>
                  <textarea required maxLength={5000} rows={3} value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} placeholder="Describe the outcome that would make this service useful to you." />
                </label>
                <div className="form-grid">
                  <label className="form-field">
                    <span className="submission-field-label">Preferred date and time <span className="submission-required-mark" aria-label="required">*</span></span>
                    <div className="submission-date-time-picker">
                      <SubmissionDatePicker
                        id="preferred-date"
                        label="Preferred date"
                        value={preferredDate}
                        min={localDateMinimum()}
                        onChange={(date) => setPreferredAt(`${date}T${preferredTime}`)}
                      />
                      <label className="submission-date-time-picker__time">
                        <Clock3 size={16} aria-hidden="true" />
                        <input
                          type="time"
                          aria-label="Preferred time"
                          required
                          min={localTimeMinimum(preferredDate)}
                          value={preferredTime}
                          onChange={(event) => setPreferredAt(`${preferredDate}T${event.target.value}`)}
                        />
                      </label>
                    </div>
                    <small className="field-note">This is a preferred time, not a confirmed booking.</small>
                  </label>
                  <label className="form-field">
                    <span className="submission-field-label">Phone number <span className="submission-required-mark" aria-label="required">*</span></span>
                    <input required type="tel" maxLength={40} autoComplete="tel" value={submitterPhone} onChange={(event) => setSubmitterPhone(event.target.value)} placeholder="A number the service team can reach you on" />
                  </label>
                </div>
              </>
            )}
            {category === 'student' && (
              <>
                <div className="form-grid">
                  <label className="form-field"><span className="submission-field-label">Student number <span className="submission-required-mark" aria-label="required">*</span></span><input required maxLength={80} value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} /></label>
                  <label className="form-field"><span className="submission-field-label">Programme <span className="submission-required-mark" aria-label="required">*</span></span><input required maxLength={200} value={programme} onChange={(event) => setProgramme(event.target.value)} /></label>
                </div>
                <div className={`form-grid ${!isSubmitter ? 'submission-supervisor-status-row' : ''}`}>
                  {!isSubmitter && <label className="form-field"><span className="submission-field-label">Supervisor</span><span className="field-note">Optional; can be added later.</span><input maxLength={255} value={supervisor} onChange={(event) => setSupervisor(event.target.value)} /></label>}
                  <div className="form-field">
                    <span id="recommendation-letter-status-label">Recommendation letter status <span className="submission-required-mark" aria-label="required">*</span></span>
                    <Select value={recommendationLetterStatus} onValueChange={setRecommendationLetterStatus}>
                      <SelectTrigger
                        aria-labelledby="recommendation-letter-status-label"
                        className={`submission-form-select-trigger ${!isSubmitter ? 'submission-recommendation-select' : ''}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="submission-select-content submission-form-select-content" sideOffset={6}>
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
            {attemptedAdvance && !detailsValid && <p className="api-error" role="alert">{category === 'service_request' && preferredAt && !isFutureDateTime(preferredAt) ? 'Choose a preferred date and time in the future.' : 'Fill in every required field before continuing.'}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="form-section">
            <p className="submission-document-intro"><FileText size={17} />{category === 'service_request'
              ? 'Add any supporting documents that will help the service team understand your request. This step is optional.'
              : 'Upload each required file from your device. PDF, Office, image and common design files are supported (up to 15 MB per file).'}</p>
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
            {rulesQuery.isLoading && <p className="field-note">Loading the department rules…</p>}
            {rulesQuery.isError && (
              <div className="api-error api-error-banner" role="alert">Could not load the department rules. Try again before continuing.</div>
            )}
            {rulesQuery.isSuccess && <RulesAcceptance rules={generalRules} value={acceptedRuleIds} onChange={setAcceptedRuleIds} />}
            {attemptedAdvance && !rulesAccepted && <p className="api-error" role="alert">You must accept the rules before continuing.</p>}
          </div>
        )}

        {step === 4 && (
          <div className="form-section">
            <div className="case-fields">
              <SummaryField label="Type" value={category === 'student' ? 'Student project' : category === 'service_request' ? 'Service request' : 'General innovation'} />
              <SummaryField label="Title" value={title} />
              <SummaryField label="Purpose" value={purpose} />
              <SummaryField label="Problem addressed" value={problemAddressed} />
              {category === 'service_request' && <>
                <SummaryField label="Service needed" value={serviceRequested} />
                <SummaryField label="Requester type" value={serviceRequester} />
                {department.trim() && <SummaryField label="Department or team" value={department} />}
                <SummaryField label="Expected result" value={expectedResult} />
                <SummaryField label="Preferred date and time" value={preferredAt ? new Date(preferredAt).toLocaleString() : ''} />
                <SummaryField label="Contact phone" value={submitterPhone} />
              </>}
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
                {busy
                  ? (isSubmitter ? category === 'service_request' ? 'Sending request…' : 'Submitting brief…' : 'Saving draft…')
                  : (isSubmitter ? category === 'service_request' ? 'Submit service request' : 'Submit brief' : 'Create draft')}
                {!busy && <ArrowRight size={15} />}
              </button>}
        </div>
      </form>
      {isSubmitter && (
        <aside className="submission-guide">
          <span className="submission-guide-icon">{category === 'service_request' ? <BriefcaseBusiness size={20} /> : <Lightbulb size={20} />}</span>
          <p className="eyebrow">WHAT HAPPENS NEXT</p>
          <h2>{category === 'service_request' ? 'The right team takes it from here.' : 'Your idea has room to grow.'}</h2>
          <p>{category === 'service_request' ? 'The service team will review your request and contact you to confirm the next step.' : 'Once you submit, the UniPod team will check your brief and guide it through the review process.'}</p>
          <div className="submission-guide-steps">
            {category === 'service_request'
              ? <>
                  <span><i>01</i><b>Request received</b><small>Your details are linked to your account.</small></span>
                  <span><i>02</i><b>Team review</b><small>The service team checks availability.</small></span>
                  <span><i>03</i><b>Next steps</b><small>Track updates in Service Requests.</small></span>
                </>
              : <>
                  <span><i>01</i><b>Completeness check</b><small>Reception reviews your brief.</small></span>
                  <span><i>02</i><b>Fact-finding</b><small>Your idea gets a closer look.</small></span>
                  <span><i>03</i><b>Stay in the loop</b><small>Track updates in My Submissions.</small></span>
                </>}
          </div>
          <div className="submission-guide-note"><ShieldCheck size={16} /><span>{category === 'service_request' ? 'Your request is connected to your account so you can follow its progress.' : 'Your brief is connected to your account, so you can follow its progress.'}</span></div>
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
