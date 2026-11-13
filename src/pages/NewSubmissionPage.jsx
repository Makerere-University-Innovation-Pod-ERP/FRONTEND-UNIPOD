import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';

const STEPS = ['Type', 'Details', 'Documents', 'Department rules', 'Check & submit'];

function documentRequirementsFor(category, recommendationLetterStatus) {
  const requirements = [
    { id: 'brief', label: 'Project brief or description document', required: true },
    { id: 'evidence', label: 'Supporting evidence (data, photos, reports)', required: false },
  ];
  if (category === 'student' && recommendationLetterStatus !== 'not_required') {
    requirements.push({ id: 'recommendation', label: 'Recommendation letter', required: true });
  }
  return requirements;
}

export function NewSubmissionPage({
  token,
  onUnauthorized,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('student');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [problemAddressed, setProblemAddressed] = useState('');
  const [submitterId, setSubmitterId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [recommendationLetterStatus, setRecommendationLetterStatus] = useState('submitted');
  const [documentRefs, setDocumentRefs] = useState({});
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [attemptedAdvance, setAttemptedAdvance] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const documentRequirements = useMemo(
    () => documentRequirementsFor(category, recommendationLetterStatus),
    [category, recommendationLetterStatus],
  );

  const detailsValid = Boolean(
    title.trim() && purpose.trim() && problemAddressed.trim() &&
    (category !== 'student' || (studentNumber.trim() && programme.trim() && supervisor.trim())),
  );
  const documentsValid = documentRequirements.every(
    (requirement) => !requirement.required || (documentRefs[requirement.id] || '').trim(),
  );
  const stepValid = [true, detailsValid, documentsValid, rulesAccepted, true][step];

  function setDocumentRef(id, value) {
    setDocumentRefs((current) => ({ ...current, [id]: value }));
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

  async function submit(event) {
    event.preventDefault();
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
      ...(submitterId.trim() ? { submitterId: submitterId.trim() } : {}),
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
      await Promise.all(
        documentRequirements
          .filter((requirement) => (documentRefs[requirement.id] || '').trim())
          .map((requirement) =>
            backendApi.addDocument(token, created.id, {
              name: requirement.label,
              status: 'SUBMITTED',
              fileReference: documentRefs[requirement.id].trim(),
            }).catch(() => null),
          ),
      );
      navigate('/submissions/new/confirmation', { state: { submission: created } });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not create the submission.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-page page-enter">
      <Link to="/submissions" className="back-link"><ArrowLeft size={15} />Back to submissions</Link>
      <div className="live-page-heading compact-heading"><div><p className="eyebrow">INTAKE · NEW CASE</p><h1>Register an idea.</h1><p>Create a draft record in the live MUTIC ERP database.</p></div></div>
      <form className="live-panel create-form" onSubmit={submit}>
        <p className="eyebrow">STEP {step + 1} OF {STEPS.length} · {STEPS[step].toUpperCase()}</p>

        {step === 0 && (
          <div className="form-section">
            <p className="form-section-title">01 <span>Submission type</span></p>
            <div className="category-options">
              <label className={`category-option ${category === 'student' ? 'selected' : ''}`}>
                <input type="radio" name="category" value="student" checked={category === 'student'} onChange={() => setCategory('student')} />
                <span><b>Student project</b><small>Student-led work submitted through a programme or supervisor.</small></span>
              </label>
              <label className={`category-option ${category === 'general' ? 'selected' : ''}`}>
                <input type="radio" name="category" value="general" checked={category === 'general'} onChange={() => setCategory('general')} />
                <span><b>General innovation</b><small>Ideas and projects from the wider university community.</small></span>
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-section">
            <p className="form-section-title">02 <span>Project information</span></p>
            <label className="form-field">Project title<input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give the project a clear, concise title" /></label>
            <label className="form-field">Purpose<textarea required maxLength={5000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="What does this project aim to achieve?" /></label>
            <label className="form-field">Problem addressed<textarea required maxLength={5000} rows={3} value={problemAddressed} onChange={(event) => setProblemAddressed(event.target.value)} placeholder="What problem or need does it respond to?" /></label>
            <label className="form-field">Submitter ID <span className="field-note">Optional; use an existing account identifier when linking an account.</span><input maxLength={255} value={submitterId} onChange={(event) => setSubmitterId(event.target.value)} /></label>
            {category === 'student' && (
              <>
                <div className="form-grid">
                  <label className="form-field">Student number<input required maxLength={80} value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} /></label>
                  <label className="form-field">Programme<input required maxLength={200} value={programme} onChange={(event) => setProgramme(event.target.value)} /></label>
                </div>
                <div className="form-grid">
                  <label className="form-field">Supervisor<input required maxLength={255} value={supervisor} onChange={(event) => setSupervisor(event.target.value)} /></label>
                  <label className="form-field">Recommendation letter status<select value={recommendationLetterStatus} onChange={(event) => setRecommendationLetterStatus(event.target.value)}><option value="submitted">Submitted</option><option value="verified">Verified</option><option value="one_file">One file</option><option value="not_required">Not required</option></select></label>
                </div>
              </>
            )}
            {attemptedAdvance && !detailsValid && <p className="api-error" role="alert">Fill in every required field before continuing.</p>}
          </div>
        )}

        {step === 2 && (
          <div className="form-section">
            <p className="form-section-title">03 <span>Documents</span></p>
            <p className="field-note">Add a reference for each document you have ready. Required documents must have a reference before you can submit.</p>
            {documentRequirements.map((requirement) => (
              <label className="form-field" key={requirement.id}>
                {requirement.label} {requirement.required ? <span className="field-note">Required</span> : <span className="field-note">Optional</span>}
                <input
                  maxLength={255}
                  value={documentRefs[requirement.id] || ''}
                  onChange={(event) => setDocumentRef(requirement.id, event.target.value)}
                  placeholder="File name or storage reference"
                />
                {attemptedAdvance && requirement.required && !(documentRefs[requirement.id] || '').trim() && (
                  <span className="api-error" role="alert" style={{ marginTop: 4 }}>This document is required.</span>
                )}
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="form-section">
            <p className="form-section-title">04 <span>Department rules</span></p>
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
            <p className="form-section-title">05 <span>Check & submit</span></p>
            <div className="case-fields">
              <SummaryField label="Type" value={category === 'student' ? 'Student project' : 'General innovation'} />
              <SummaryField label="Title" value={title} />
              <SummaryField label="Purpose" value={purpose} />
              <SummaryField label="Problem addressed" value={problemAddressed} />
              {category === 'student' && <SummaryField label="Student number / programme / supervisor" value={`${studentNumber} · ${programme} · ${supervisor}`} />}
              <SummaryField
                label="Documents"
                value={documentRequirements.map((requirement) => `${requirement.label}: ${(documentRefs[requirement.id] || '').trim() || 'not provided'}`).join('; ')}
              />
              <SummaryField label="Department rules" value={rulesAccepted ? 'Accepted' : 'Not yet accepted'} />
            </div>
          </div>
        )}

        {error && <div className="api-error api-error-banner" role="alert">{error}</div>}
        <div className="form-actions">
          {step > 0 && <button className="btn btn-outline" type="button" onClick={goBack} disabled={busy}>Back</button>}
          {step === 0 && <Link to="/submissions" className="btn btn-outline">Cancel</Link>}
          {step < STEPS.length - 1
            ? <button className="btn btn-primary" type="button" onClick={goNext}>Next<ArrowRight size={15} /></button>
            : <button className="btn btn-primary" type="submit" disabled={busy || !rulesAccepted}>
                {busy ? <LoaderCircle size={15} className="spin" /> : null}
                {busy ? 'Saving draft…' : 'Create draft'}
                {!busy && <ArrowRight size={15} />}
              </button>}
        </div>
      </form>
    </div>
  );
}

function SummaryField({ label, value }) {
  return <div className="case-field"><span>{label}</span><p>{value}</p></div>;
}
