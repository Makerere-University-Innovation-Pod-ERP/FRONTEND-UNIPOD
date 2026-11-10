/**
 * Local extension layer for Workflow 1.1 (submitter briefs).
 *
 * The current backend only stores a subset of what the submitter workflow
 * collects (category, title, purpose, problem, student fields). Everything the
 * backend cannot store yet — the service-request type, the department choice,
 * the document checklist, rule acceptance and information requests — is kept
 * in this browser so the frontend can present and continue the workflow
 * without pretending the server persisted it.
 */

export type BriefType = 'student' | 'general' | 'service';

export const BRIEF_TYPE_LABELS: Record<BriefType, string> = {
  student: 'Student project',
  general: 'General innovation',
  service: 'Service request',
};

export const BRIEF_TYPE_DESCRIPTIONS: Record<BriefType, string> = {
  student: 'A student-led project submitted through a programme or supervisor.',
  general: 'An idea or project from the wider university community.',
  service: 'A request for a service from a university department or unit.',
};

export const DOCUMENT_KINDS = [
  'Project brief',
  'Supporting evidence',
  'Student identification',
  'Recommendation letter',
  'Service request letter',
  'Budget or quotation',
  'Other',
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type DocumentRequirement = {
  kind: DocumentKind;
  required: boolean;
  guidance: string;
};

/**
 * The document requirement matrix shown in step 3 of the wizard.
 * Keep this in one place so the wizard, confirmation page and the submitter
 * brief page always agree on what is required.
 */
export const DOCUMENT_REQUIREMENTS: Record<BriefType, DocumentRequirement[]> = {
  student: [
    { kind: 'Project brief', required: true, guidance: 'A short description of the idea, the problem and the intended outcome.' },
    { kind: 'Student identification', required: true, guidance: 'A student ID or current enrolment confirmation.' },
    { kind: 'Recommendation letter', required: false, guidance: 'Helpful when a supervisor or programme is endorsing the work.' },
    { kind: 'Supporting evidence', required: false, guidance: 'Sketches, data, photographs or other context.' },
  ],
  general: [
    { kind: 'Project brief', required: true, guidance: 'A short description of the idea, the problem and the intended outcome.' },
    { kind: 'Supporting evidence', required: false, guidance: 'Sketches, data, photographs or other context.' },
  ],
  service: [
    { kind: 'Service request letter', required: true, guidance: 'Describe the service needed, the intended users and the expected timing.' },
    { kind: 'Budget or quotation', required: false, guidance: 'Attach a cost estimate when the request needs funding or procurement.' },
    { kind: 'Supporting evidence', required: false, guidance: 'Any documents that help the department understand the request.' },
  ],
};

export const GENERAL_RULES = [
  'Submit only work or requests you are allowed to share. Do not include confidential third-party information.',
  'Give accurate contact details and enough detail for reception and the receiving department to understand the brief.',
  'A submitted brief is a request for consideration. It does not transfer ownership of your idea or guarantee a service, funding or placement.',
  'UniPod staff may contact you for clarification and may share the brief with the relevant university department.',
  'Tell reception promptly if the information in the brief changes or if you want to withdraw it.',
] as const;

export const DEPARTMENT_RULES = [
  'The receiving department may review the brief before it accepts the request.',
  'Department staff may ask for more information or for a revised document before work starts.',
  'The department may decline the request when it falls outside its mandate, capacity or available budget.',
  'Any service delivered is subject to the department’s own approvals, timelines and safety requirements.',
] as const;

export type BriefDocument = {
  id: string;
  kind: DocumentKind;
  name: string;
  fileName: string | null;
  fileSize: number | null;
  addedAt: string;
};

export type RulesAcceptance = {
  general: boolean;
  departmentId: string | null;
  departmentName: string | null;
  departmentRules: boolean;
  acceptedAt: string | null;
};

export type InformationRequestItem = {
  id: string;
  label: string;
  done: boolean;
};

export type InformationRequest = {
  id: string;
  requestedBy: string;
  requestedAt: string;
  message: string;
  items: InformationRequestItem[];
  status: 'OPEN' | 'ANSWERED';
  response: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
};

export type BriefRecord = {
  submissionId: string;
  type: BriefType;
  title: string;
  purpose: string;
  problemAddressed: string;
  departmentId: string | null;
  departmentName: string | null;
  documents: BriefDocument[];
  rules: RulesAcceptance;
  infoRequests: InformationRequest[];
  submittedAt: string;
  /** The tracking reference is issued by reception, never by the submitter. */
  trackingReference: string | null;
  /** True when the brief exists only in this browser (no backend record yet). */
  localOnly: boolean;
};

const BRIEFS_KEY = 'unipod.submission-briefs';
const GENERAL_RULES_KEY = 'unipod.general-rules-accepted-v1';

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    storage()?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

export function loadBriefs(): Record<string, BriefRecord> {
  const raw = readStorage(BRIEFS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, BriefRecord>;
  } catch {
    return {};
  }
}

export function saveBrief(record: BriefRecord): boolean {
  const briefs = loadBriefs();
  briefs[record.submissionId] = record;
  return writeStorage(BRIEFS_KEY, JSON.stringify(briefs));
}

export function getBrief(submissionId: string): BriefRecord | null {
  return loadBriefs()[submissionId] ?? null;
}

export function deleteBrief(submissionId: string): void {
  const briefs = loadBriefs();
  delete briefs[submissionId];
  writeStorage(BRIEFS_KEY, JSON.stringify(briefs));
}

export function emptyRules(): RulesAcceptance {
  return {
    general: false,
    departmentId: null,
    departmentName: null,
    departmentRules: false,
    acceptedAt: null,
  };
}

export function inferBriefType(category: 'student' | 'general' | null | undefined): BriefType {
  return category === 'student' ? 'student' : 'general';
}

/**
 * Returns a brief for a case, creating a minimal local record when the case was
 * registered by staff and has no local extension record yet. This lets staff
 * request more information on any case without a separate data source.
 */
export function getOrCreateBrief(
  submissionId: string,
  options: { type?: BriefType; title?: string; category?: 'student' | 'general' } = {},
): BriefRecord {
  const existing = getBrief(submissionId);
  if (existing) return existing;
  const type = options.type ?? inferBriefType(options.category);
  const record: BriefRecord = {
    submissionId,
    type,
    title: options.title ?? '',
    purpose: '',
    problemAddressed: '',
    departmentId: null,
    departmentName: null,
    documents: [],
    rules: emptyRules(),
    infoRequests: [],
    submittedAt: new Date().toISOString(),
    trackingReference: null,
    localOnly: false,
  };
  saveBrief(record);
  return record;
}

export function requestInformation(
  submissionId: string,
  options: {
    message: string;
    items?: string[];
    requestedBy: string;
    type?: BriefType;
    title?: string;
    category?: 'student' | 'general';
  },
): InformationRequest {
  const brief = getOrCreateBrief(submissionId, options);
  const request: InformationRequest = {
    id: createId('info'),
    requestedBy: options.requestedBy,
    requestedAt: new Date().toISOString(),
    message: options.message.trim(),
    items: (options.items ?? [])
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({ id: createId('item'), label, done: false })),
    status: 'OPEN',
    response: null,
    respondedAt: null,
    respondedBy: null,
  };
  brief.infoRequests = [request, ...brief.infoRequests];
  saveBrief(brief);
  return request;
}

export function answerInformationRequest(
  submissionId: string,
  requestId: string,
  response: string,
  respondedBy: string,
): BriefRecord | null {
  const brief = getBrief(submissionId);
  if (!brief) return null;
  brief.infoRequests = brief.infoRequests.map((request) => request.id === requestId
    ? {
        ...request,
        status: 'ANSWERED' as const,
        response: response.trim(),
        respondedAt: new Date().toISOString(),
        respondedBy,
      }
    : request);
  saveBrief(brief);
  return brief;
}

export function setBriefReference(submissionId: string, reference: string | null): BriefRecord | null {
  const brief = getBrief(submissionId);
  if (!brief) return null;
  brief.trackingReference = reference;
  saveBrief(brief);
  return brief;
}

export type ChecklistItem = {
  kind: DocumentKind;
  required: boolean;
  guidance: string;
  present: boolean;
  documents: BriefDocument[];
};

export function documentChecklist(type: BriefType, documents: BriefDocument[]): ChecklistItem[] {
  return DOCUMENT_REQUIREMENTS[type].map((requirement) => ({
    ...requirement,
    documents: documents.filter((document) => document.kind === requirement.kind),
    present: documents.some((document) => document.kind === requirement.kind),
  }));
}

export function missingRequiredDocuments(type: BriefType, documents: BriefDocument[]): DocumentKind[] {
  return documentChecklist(type, documents)
    .filter((item) => item.required && !item.present)
    .map((item) => item.kind);
}

export function hasAcceptedGeneralRules(): boolean {
  return readStorage(GENERAL_RULES_KEY) === 'true';
}

export function acceptGeneralRules(): void {
  writeStorage(GENERAL_RULES_KEY, 'true');
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
