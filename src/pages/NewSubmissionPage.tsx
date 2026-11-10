import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, FileText, Info, LoaderCircle, Plus,
  Send, ShieldCheck, Trash2, Upload,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, backendApi, type Sector, type Submission } from '@/services/backend-api';
import {
  acceptGeneralRules, BRIEF_TYPE_DESCRIPTIONS, BRIEF_TYPE_LABELS, createId, DEPARTMENT_RULES,
  DOCUMENT_KINDS, documentChecklist, formatFileSize, GENERAL_RULES,
  hasAcceptedGeneralRules, missingRequiredDocuments, saveBrief,
  type BriefDocument, type BriefType, type DocumentKind,
} from '@/lib/brief';

type DraftDocument = BriefDocument & { file?: File };

type Draft = {
  type: BriefType | null;
  title: string;
  purpose: string;
  problemAddressed: string;
  studentNumber: string;
  programme: string;
  supervisor: string;
  recommendationLetterStatus: string;
  departmentName: string;
  rulesGeneral: boolean;
  rulesDepartment: boolean;
};

const STEPS = [
  'Submission type',
  'Brief details',
  'Documents',
  'Rules acceptance',
  'Review & submit',
];

const emptyDraft: Draft = {
  type: null,
  title: '',
  purpose: '',
  problemAddressed: '',
  studentNumber: '',
  programme: '',
  supervisor: '',
  recommendationLetterStatus: 'submitted',
  departmentName: '',
  rulesGeneral: false,
  rulesDepartment: false,
};

const RECOMMENDATION_OPTIONS = [
  { value: 'submitted', label: 'Submitted with the brief' },
  { value: 'verified', label: 'Verified by the programme' },
  { value: 'one_file', label: 'Combined into one file' },
  { value: 'not_required', label: 'Not required for this project' },
];

function validateStep(step: number, draft: Draft, documents: DraftDocument[]): string[] {
  const issues: string[] = [];
  const type = draft.type;
  if (step === 0 && !type) issues.push('Choose student innovation, general innovation or a service request.');
  if (step === 1) {
    if (!draft.title.trim()) issues.push('Add a brief title.');
    if (!draft.purpose.trim()) issues.push('Describe the purpose of the brief.');
    if (!draft.problemAddressed.trim()) issues.push('Describe the problem or need the brief responds to.');
    if (type === 'student') {
      if (!draft.studentNumber.trim()) issues.push('Add the student number.');
      if (!draft.programme.trim()) issues.push('Add the programme.');
      if (!draft.supervisor.trim()) issues.push('Add the supervisor.');
    }
    if (type === 'service' && !draft.departmentName.trim()) {
      issues.push('Choose the department that should receive the service request.');
    }
  }
  if (step === 2 && type) {
    for (const kind of missingRequiredDocuments(type, documents)) {
      issues.push(`Attach the required document: ${kind}.`);
    }
  }
  if (step === 3 && type) {
    if (!hasAcceptedGeneralRules()) issues.push('Accept the UniPod general submission rules at sign-in.');
    if (!draft.rulesGeneral) issues.push('Confirm that this brief follows the UniPod general submission rules.');
    if ((type === 'service' || draft.departmentName.trim()) && !draft.rulesDepartment) {
      issues.push(`Accept the ${draft.departmentName.trim() || 'receiving department'} rules for this brief.`);
    }
  }
  return issues;
}

export function NewSubmissionPage({
  token,
  roles,
  onUnauthorized,
}: {
  token: string;
  roles: string[];
  onUnauthorized: () => void;
}) {
  const navigate = useNavigate();
  const intakeRoles = ['ROLE_ADMINISTRATOR', 'ROLE_INNOVATION_COORDINATOR', 'ROLE_RECEPTIONIST', 'ROLE_FACT_FINDING_OFFICER'];
  const canUseBackend = roles.some((role) => intakeRoles.includes(role));
  const [draft, setDraft] = useState<Draft>(() => ({ ...emptyDraft, rulesGeneral: hasAcceptedGeneralRules() }));
  const [documents, setDocuments] = useState<DraftDocument[]>([]);
  const [departments, setDepartments] = useState<Sector[]>([]);
  const [departmentError, setDepartmentError] = useState('');
  const [step, setStep] = useState(0);
  const [docKind, setDocKind] = useState<DocumentKind>('Project brief');
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void backendApi.sectors(token, controller.signal)
      .then((value) => setDepartments(value.filter((sector) => sector.active)))
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
        else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setDepartmentError('The department list could not be loaded. You can still type the department name.');
        }
      });
    return () => controller.abort();
  }, [token, onUnauthorized]);

  const checklist = useMemo(
    () => (draft.type ? documentChecklist(draft.type, documents) : []),
    [draft.type, documents],
  );
  const missing = useMemo(
    () => (draft.type ? missingRequiredDocuments(draft.type, documents) : []),
    [draft.type, documents],
  );
  const needsDepartmentRules = draft.type === 'service' || draft.departmentName.trim().length > 0;
  const issuesForStep = validateStep(step, { ...draft }, documents);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseType(type: BriefType) {
    setDraft((current) => ({ ...current, type }));
  }

  function addDocument() {
    setError('');
    const name = docName.trim() || docFile?.name || '';
    if (!name) {
      setError('Give the document a name or choose a file to attach.');
      return;
    }
    setDocuments((current) => [...current, {
      id: createId('doc'),
      kind: docKind,
      name,
      fileName: docFile?.name ?? null,
      fileSize: docFile?.size ?? null,
      addedAt: new Date().toISOString(),
      file: docFile ?? undefined,
    }]);
    setDocName('');
    setDocFile(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id));
  }

  function next() {
    setError('');
    const issues = validateStep(step, draft, documents);
    if (issues.length) {
      setError(issues[0]);
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function buildStoredDocuments(): BriefDocument[] {
    return documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      name: document.name,
      fileName: document.fileName,
      fileSize: document.fileSize,
      addedAt: document.addedAt,
    }));
  }

  function buildRecord(submissionId: string, localOnly: boolean) {
    const now = new Date().toISOString();
    return {
      submissionId,
      type: draft.type ?? 'general',
      title: draft.title.trim(),
      purpose: draft.purpose.trim(),
      problemAddressed: draft.problemAddressed.trim(),
      departmentId: departments.find((sector) => sector.name === draft.departmentName.trim())?.id ?? null,
      departmentName: draft.departmentName.trim() || null,
      documents: buildStoredDocuments(),
      rules: {
        general: draft.rulesGeneral || hasAcceptedGeneralRules(),
        departmentId: departments.find((sector) => sector.name === draft.departmentName.trim())?.id ?? null,
        departmentName: draft.departmentName.trim() || null,
        departmentRules: draft.rulesDepartment,
        acceptedAt: draft.rulesGeneral ? now : null,
      },
      infoRequests: [],
      submittedAt: now,
      trackingReference: null,
      localOnly,
    };
  }

  function saveLocally() {
    if (!draft.type) return;
    const localId = createId('local');
    saveBrief(buildRecord(localId, true));
    navigate(`/submissions/${localId}/confirmation`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      next();
      return;
    }
    setError('');
    const issues = [
      ...validateStep(0, draft, documents),
      ...validateStep(1, draft, documents),
      ...validateStep(2, draft, documents),
      ...validateStep(3, draft, documents),
    ];
    if (issues.length) {
      setError(issues[0]);
      return;
    }
    if (!draft.type) return;
    setBusy(true);
    const body: Record<string, unknown> = {
      category: draft.type === 'student' ? 'student' : 'general',
      title: draft.title.trim(),
      purpose: draft.purpose.trim(),
      problemAddressed: draft.problemAddressed.trim(),
      ...(draft.type === 'student' ? {
        studentNumber: draft.studentNumber.trim(),
        programme: draft.programme.trim(),
        supervisor: draft.supervisor.trim(),
        recommendationLetterStatus: draft.recommendationLetterStatus,
      } : {}),
    };
    try {
      let created: Submission;
      try {
        created = await backendApi.createSubmission(token, body);
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
          onUnauthorized();
          return;
        }
        if (reason instanceof ApiError && reason.status === 403) {
          // Submitter accounts cannot create records on the current backend.
          // Persist the workflow locally and make that limitation explicit on
          // the confirmation page instead of pretending it was registered.
          saveLocally();
          return;
        }
        throw reason;
      }

      if (canUseBackend) {
        for (const document of documents) {
          if (!document.file) continue;
          const formData = new FormData();
          formData.append('name', document.name);
          formData.append('status', 'SUBMITTED');
          formData.append('file', document.file, document.fileName ?? document.name);
          try {
            await backendApi.uploadDocument(token, created.id, formData);
          } catch (reason) {
            if (reason instanceof ApiError && reason.status === 401) {
              onUnauthorized();
              return;
            }
            // The submission is already created; keep the file metadata locally and
            // let reception re-attach it if object storage is unavailable.
          }
        }
      }

      saveBrief(buildRecord(created.id, false));
      navigate(`/submissions/${created.id}/confirmation`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the brief.');
    } finally {
      setBusy(false);
    }
  }

  const allIssues = [
    ...validateStep(0, draft, documents),
    ...validateStep(1, draft, documents),
    ...validateStep(2, draft, documents),
    ...validateStep(3, draft, documents),
  ];

  return (
    <div className="live-page page-enter">
      <Link to={roles.includes('ROLE_SUBMITTER') ? '/my-submissions' : '/submissions'} className="back-link">
        <ArrowLeft size={15} />{roles.includes('ROLE_SUBMITTER') ? 'Back to my submissions' : 'Back to submissions'}
      </Link>
      <div className="live-page-heading compact-heading">
        <div>
          <p className="eyebrow">WORKFLOW 1.1 · SUBMIT A BRIEF</p>
          <h1>Submit a brief.</h1>
          <p>Tell UniPod what you are working on, attach the required documents, and accept the rules that apply.</p>
        </div>
        <div className="brief-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          <span>{step + 1} / {STEPS.length}</span>
          <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {!canUseBackend && (
        <div className="brief-alert" role="alert">
          <CircleAlert size={16} />
          <span>
            This account cannot create a backend record yet. Your brief will be saved in this browser and shown on
            My submissions; reception still needs to register it before a tracking reference exists.
          </span>
        </div>
      )}

      <div className="brief-wizard">
        <aside className="brief-wizard-steps" aria-label="Submit a brief steps">
          <p className="eyebrow">SUBMISSION FLOW</p>
          <ol>
            {STEPS.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className={`wizard-step ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`}
                  onClick={() => index <= step && setStep(index)}
                  aria-current={index === step ? 'step' : undefined}
                  disabled={index > step}
                >
                  <span>{index < step ? <Check size={13} /> : `0${index + 1}`}</span>
                  <b>{label}</b>
                </button>
              </li>
            ))}
          </ol>
          <div className="wizard-help">
            <ShieldCheck size={16} />
            <p>Required documents are marked. Service requests also need the receiving department’s rules.</p>
          </div>
        </aside>

        <form className="live-panel brief-wizard-panel" onSubmit={submit}>
          <div className="wizard-panel-heading">
            <div>
              <p className="eyebrow">STEP 0{step + 1} / 0{STEPS.length}</p>
              <h2>{STEPS[step]}</h2>
            </div>
            <span className="wizard-progress-track"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></span>
          </div>

          {step === 0 && <section className="form-section">
            <p className="form-section-title">01 <span>What are you submitting?</span></p>
            <div className="category-options brief-type-options">
              {(Object.keys(BRIEF_TYPE_LABELS) as BriefType[]).map((type) => (
                <label key={type} className={`category-option ${draft.type === type ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="brief-type"
                    value={type}
                    checked={draft.type === type}
                    onChange={() => chooseType(type)}
                  />
                  <span><b>{BRIEF_TYPE_LABELS[type]}</b><small>{BRIEF_TYPE_DESCRIPTIONS[type]}</small></span>
                </label>
              ))}
            </div>
            <p className="field-note">
              Service requests are stored as a general innovation in the current backend because a dedicated service
              category is not available yet. The local brief keeps the service type for your checklist and follow-up.
            </p>
          </section>}

          {step === 1 && <section className="form-section">
            <p className="form-section-title">02 <span>Brief details</span></p>
            <label className="form-field">Brief title
              <input required maxLength={240} value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Give the brief a clear, concise title" />
            </label>
            <label className="form-field">Purpose
              <textarea required maxLength={5000} rows={3} value={draft.purpose} onChange={(event) => update('purpose', event.target.value)} placeholder="What should this project or request achieve?" />
            </label>
            <label className="form-field">Problem or need addressed
              <textarea required maxLength={5000} rows={3} value={draft.problemAddressed} onChange={(event) => update('problemAddressed', event.target.value)} placeholder="What problem, gap or need does it respond to?" />
            </label>

            {draft.type === 'student' && <>
              <p className="form-section-title">Student details</p>
              <div className="form-grid">
                <label className="form-field">Student number<input required maxLength={80} value={draft.studentNumber} onChange={(event) => update('studentNumber', event.target.value)} /></label>
                <label className="form-field">Programme<input required maxLength={200} value={draft.programme} onChange={(event) => update('programme', event.target.value)} /></label>
              </div>
              <div className="form-grid">
                <label className="form-field">Supervisor<input required maxLength={255} value={draft.supervisor} onChange={(event) => update('supervisor', event.target.value)} /></label>
                <label className="form-field">Recommendation letter
                  <select value={draft.recommendationLetterStatus} onChange={(event) => update('recommendationLetterStatus', event.target.value)}>
                    {RECOMMENDATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            </>}

            <p className="form-section-title">Receiving department</p>
            <label className="form-field">
              {draft.type === 'service' ? 'Department that should handle the request' : 'Preferred department (optional)'}
              <input
                list="unipod-department-options"
                maxLength={200}
                required={draft.type === 'service'}
                value={draft.departmentName}
                onChange={(event) => update('departmentName', event.target.value)}
                placeholder="Start typing a department or unit"
              />
              <datalist id="unipod-department-options">
                {departments.map((sector) => <option key={sector.id} value={sector.name} />)}
              </datalist>
            </label>
            {departmentError && <p className="field-note">{departmentError}</p>}
            <p className="field-note">
              {draft.type === 'service'
                ? 'The department’s rules must be accepted in step 4 before the request can be submitted.'
                : 'Choosing a department adds its rules to step 4. You can leave this blank when you are not sure.'}
            </p>
          </section>}

          {step === 2 && draft.type && <section className="form-section">
            <p className="form-section-title">03 <span>Supporting documents</span></p>
            <div className="doc-checklist" aria-label="Document checklist">
              {checklist.map((item) => (
                <div key={item.kind} className={`doc-check ${item.present ? 'present' : item.required ? 'missing' : ''}`}>
                  <span className="doc-check-icon">{item.present ? <Check size={13} /> : <FileText size={13} />}</span>
                  <span className="doc-check-copy">
                    <b>{item.kind}</b>
                    <small>{item.guidance}</small>
                  </span>
                  <span className={`doc-flag ${item.required ? 'required' : 'optional'}`}>
                    {item.required ? (item.present ? 'Required · attached' : 'Required · missing') : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
            {missing.length > 0 && <div className="brief-alert" role="alert">
              <CircleAlert size={16} />
              <span>Missing required {missing.length === 1 ? 'document' : 'documents'}: {missing.join(', ')}.</span>
            </div>}

            <div className="doc-uploader">
              <p className="form-section-title">Add a document</p>
              <div className="form-grid">
                <label className="form-field">Document type
                  <select value={docKind} onChange={(event) => setDocKind(event.target.value as DocumentKind)}>
                    {DOCUMENT_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                  </select>
                </label>
                <label className="form-field">Document name
                  <input maxLength={255} value={docName} onChange={(event) => setDocName(event.target.value)} placeholder="e.g. Project brief v1" />
                </label>
              </div>
              <label className="form-field">File <span className="field-note">Optional in this frontend build; attach the file when reception contacts you if your account cannot upload.</span>
                <input ref={fileInput} type="file" onChange={(event) => setDocFile(event.target.files?.[0] ?? null)} />
              </label>
              <button type="button" className="btn btn-outline" onClick={addDocument} disabled={!docName.trim() && !docFile}>
                <Plus size={14} />Add document
              </button>
              <p className="field-note">
                Files attached by a submitter account stay in this browser as a checklist entry. Staff accounts with
                intake access upload them to the case after the brief is created.
              </p>
            </div>

            {documents.length > 0 && <ul className="doc-attached-list">
              {documents.map((document) => (
                <li key={document.id}>
                  <span><b>{document.name}</b><small>{document.kind}{document.fileName ? ` · ${document.fileName}` : ''}{document.fileSize ? ` · ${formatFileSize(document.fileSize)}` : ''}</small></span>
                  <button type="button" className="icon-button" onClick={() => removeDocument(document.id)} aria-label={`Remove ${document.name}`}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>}
          </section>}

          {step === 3 && draft.type && <section className="form-section">
            <p className="form-section-title">04 <span>Rules acceptance</span></p>
            <div className="rules-box">
              <p className="eyebrow">UNIPOD GENERAL SUBMISSION RULES</p>
              <ul className="rules-list">{GENERAL_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              <label className="rules-acceptance">
                <input type="checkbox" checked={draft.rulesGeneral} onChange={(event) => {
                  update('rulesGeneral', event.target.checked);
                  if (event.target.checked) acceptGeneralRules();
                }} />
                <span>I have read and accept the UniPod general submission rules, and the information in this brief is accurate.</span>
              </label>
            </div>

            {needsDepartmentRules && <div className="rules-box">
              <p className="eyebrow">{draft.departmentName.trim() || 'RECEIVING DEPARTMENT'} RULES</p>
              <ul className="rules-list">{DEPARTMENT_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              <label className="rules-acceptance">
                <input type="checkbox" checked={draft.rulesDepartment} onChange={(event) => update('rulesDepartment', event.target.checked)} />
                <span>I accept the rules of the department that will receive this brief.</span>
              </label>
            </div>}

            {!needsDepartmentRules && <p className="field-note">
              No department was chosen, so only the general UniPod rules apply. Add a department in step 2 if the
              brief should be routed to a specific unit.
            </p>}
          </section>}

          {step === 4 && draft.type && <section className="form-section">
            <p className="form-section-title">05 <span>Review & submit</span></p>
            {allIssues.length > 0 && <div className="brief-alert" role="alert">
              <CircleAlert size={16} />
              <span>
                <b>Before you can submit:</b>
                <ul>{allIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
              </span>
            </div>}
            {!canUseBackend && <div className="brief-alert" role="alert">
              <CircleAlert size={16} />
              <span>
                <b>Backend permission:</b> submitter accounts cannot create a record on the current backend. Submitting
                saves the brief in this browser only. Reception must register it and issue the tracking reference.
              </span>
            </div>}
            <div className="brief-notice">
              <Info size={16} />
              <span>
                Service requests are stored as a general innovation in the backend. Your local brief keeps the
                service type, department and rules so staff can see what is still missing.
              </span>
            </div>

            <div className="summary-grid">
              <div><span>Brief type</span><b>{BRIEF_TYPE_LABELS[draft.type]}</b></div>
              <div><span>Receiving department</span><b>{draft.departmentName.trim() || 'Not specified'}</b></div>
              <div className="summary-wide"><span>Title</span><b>{draft.title.trim()}</b></div>
              <div className="summary-wide"><span>Purpose</span><p>{draft.purpose.trim()}</p></div>
              <div className="summary-wide"><span>Problem or need</span><p>{draft.problemAddressed.trim()}</p></div>
              {draft.type === 'student' && <>
                <div><span>Student number</span><b>{draft.studentNumber.trim()}</b></div>
                <div><span>Programme</span><b>{draft.programme.trim()}</b></div>
                <div><span>Supervisor</span><b>{draft.supervisor.trim()}</b></div>
                <div><span>Recommendation letter</span><b>{RECOMMENDATION_OPTIONS.find((option) => option.value === draft.recommendationLetterStatus)?.label}</b></div>
              </>}
            </div>

            <div className="summary-section">
              <p className="form-section-title">Documents</p>
              <ul className="summary-checklist">
                {checklist.map((item) => <li key={item.kind} className={item.present ? 'present' : item.required ? 'missing' : ''}>
                  <span>{item.present ? <Check size={12} /> : <FileText size={12} />}</span>
                  <b>{item.kind}</b>
                  <small>{item.required ? 'Required' : 'Optional'}{item.present ? ' · attached' : item.required ? ' · missing' : ' · not provided'}</small>
                </li>)}
              </ul>
            </div>

            <div className="summary-section">
              <p className="form-section-title">Acceptances</p>
              <p className="summary-rule-line">{draft.rulesGeneral ? <Check size={13} /> : <CircleAlert size={13} />} UniPod general submission rules {draft.rulesGeneral ? 'accepted' : 'not accepted'}</p>
              {needsDepartmentRules && <p className="summary-rule-line">{draft.rulesDepartment ? <Check size={13} /> : <CircleAlert size={13} />} {draft.departmentName.trim()} rules {draft.rulesDepartment ? 'accepted' : 'not accepted'}</p>}
            </div>

            <div className="brief-notice">
              <Send size={16} />
              <span>
                On receipt, the brief appears in the reception queue. Reception registers it, issues the tracking
                reference and notifies the receiving department. You can follow progress and answer requests for more
                information from My submissions.
              </span>
            </div>
          </section>}

          {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}

          <div className="form-actions wizard-actions">
            {step > 0
              ? <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep((current) => Math.max(0, current - 1)); }}><ArrowLeft size={15} />Back</button>
              : <Link to={roles.includes('ROLE_SUBMITTER') ? '/my-submissions' : '/submissions'} className="btn btn-outline">Cancel</Link>}
            {step < STEPS.length - 1
              ? <button type="button" className="btn btn-primary" onClick={next} disabled={issuesForStep.length > 0}>Continue<ArrowRight size={15} /></button>
              : <button type="submit" className="btn btn-primary" disabled={busy || allIssues.length > 0}>
                  {busy ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}
                  {busy ? 'Submitting…' : 'Submit brief'}
                </button>}
          </div>
          {issuesForStep.length > 0 && step < STEPS.length - 1 && <p className="field-note wizard-blocked">{issuesForStep[0]}</p>}
        </form>
      </div>
    </div>
  );
}
