import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  defaultChecklist, demoState, initialState,
  type ChecklistItem, type DemoDocument, type DocumentRequirement, type HubSettings,
  type IPSubmission, type Notification, type RefinementRequest, type Review,
  type RoutingRecord, type State, type Submission, type Stage,
} from './model';

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const roleNames: Record<string, string> = {
  Administrator: 'Alice Nabirye',
  'Innovation coordinator': 'Sarah Kintu',
  'Receiving officer': 'Martha Akello',
  Receptionist: 'Martha Akello',
  Reviewer: 'Dr. Miriam Nsubuga',
  'Fact-finding officer': 'Joseph Lwanga',
  'Sector officer': 'Peter Okello',
  'IP liaison': 'Amina Ssemanda',
  'Student submitter': 'Lydia Nakanwagi',
  'Read-only observer': 'Guest Observer',
};

type NewReview = Omit<Review, 'id' | 'date'> & { id?: string; date?: string };
type RegisterRecord = Omit<Submission, 'activities' | 'reviews' | 'feedback' | 'revisions' | 'routing' | 'revisionHistory'>;

type HubContextValue = {
  state: State;
  update: (id: string, patch: Partial<Submission>, action?: string) => void;
  register: (record: RegisterRecord) => void;
  reset: () => void;
  setRole: (role: string) => void;
  updateConfig: (patch: Partial<Pick<State, 'sectors' | 'reviewers' | 'documents' | 'documentRequirements' | 'settings' | 'notifications'>>) => void;
  setStage: (id: string, stage: Stage, action?: string) => void;
  initBrief: (id: string) => void;
  completeBrief: (id: string) => void;
  submitBrief: (id: string) => void;
  saveAssessment: (id: string, checklist: ChecklistItem[], assessment: string) => void;
  assignReview: (id: string, reviewer: string, role: string, mode: 'Sequential' | 'Parallel', sequence?: number) => void;
  recordReview: (id: string, review: NewReview) => void;
  submitToIP: (id: string, notes: string) => void;
  updateIP: (id: string, ipId: string, patch: Partial<IPSubmission>) => void;
  requestRefinement: (id: string, items: string[], message: string, due?: string) => void;
  resolveRefinement: (id: string, requestId: string) => void;
  resubmit: (id: string, response: string) => void;
  route: (id: string, sector: string, note: string) => void;
  respondRouting: (id: string, routeId: string, status: NonNullable<RoutingRecord['status']>, note?: string) => void;
  addDocument: (id: string, doc: Omit<DemoDocument, 'id'>) => void;
  verifyDocument: (id: string, docId: string, status: DemoDocument['status'], notes: string) => void;
  requestDocument: (id: string, kind: string, reason: string) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  setSettings: (patch: Partial<HubSettings>) => void;
  addRequirement: (requirement: Omit<DocumentRequirement, 'id'>) => void;
  removeRequirement: (id: string) => void;
};

const HubContext = createContext<HubContextValue | null>(null);

const generateCode = (current: State): string => {
  const year = String(new Date().getFullYear());
  const used = new Set(current.submissions.map(s => s.code).filter(Boolean) as string[]);
  let next = current.submissions.filter(s => s.category === 'Student Project').length + 1;
  let code = '';
  do {
    code = current.settings.codeFormat.split('{year}').join(year).split('{seq}').join(String(next).padStart(3, '0'));
    next += 1;
  } while (used.has(code));
  return code;
};

const pushNote = (current: State, title: string, body: string, link: string): Notification[] => {
  if (!current.settings.notificationsEnabled) return current.notifications;
  return [{ id: uid('note'), title, body, link, date: today(), read: false }, ...current.notifications];
};

export function HubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  useEffect(() => { localStorage.setItem('innovation-hub-state', JSON.stringify(state)); }, [state]);

  const commit = useCallback((
    id: string,
    updater: (submission: Submission, actor: string) => Partial<Submission>,
    action: string,
    note?: { title: string; body: string; link?: string },
  ) => {
    setState(current => {
      const target = current.submissions.find(s => s.id === id);
      if (!target) return current;
      const actor = current.displayName;
      const submissions = current.submissions.map(s => s.id === id ? {
        ...s, ...updater(s, actor), updated: today(),
        activities: [{ id: uid('act'), action, actor, date: today() }, ...s.activities],
      } : s);
      const notifications = note ? pushNote(current, note.title, note.body, note.link ?? `/submissions/${id}`) : current.notifications;
      return { ...current, submissions, notifications };
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<Submission>, action = 'Submission updated') => commit(id, () => patch, action), [commit]);
  const setStage = useCallback((id: string, stage: Stage, action?: string) => commit(id, () => ({ stage }), action || `Moved to ${stage}`), [commit]);

  const register = useCallback((record: RegisterRecord) => {
    setState(current => {
      const code = record.category === 'Student Project' ? generateCode(current) : undefined;
      const created = record.created || today();
      const submission: Submission = {
        ...record,
        code,
        codeProvisional: Boolean(code) && current.settings.codeAssignment === 'On receipt',
        codeAssignedAt: code ? today() : undefined,
        receivedAt: created,
        brief: { initiatedBy: record.officer, initiatedAt: created, completedBy: record.officer, completedAt: created, submittedBy: record.officer, submittedAt: created },
        ip: [], refinementRequests: [], documentRequests: [], assessmentChecklist: defaultChecklist(),
        outcomeState: 'In progress', outcomeReason: '',
        activities: [{ id: uid('act'), action: 'Submission registered', actor: current.displayName, date: created }],
        reviews: [], feedback: [], routing: [], revisionHistory: [], revisions: 0,
        docs: (record.docs ?? []).map(d => ({ uploadedBy: record.officer, status: 'Submitted', notes: '', ...d })),
      };
      return {
        ...current,
        submissions: [submission, ...current.submissions],
        notifications: pushNote(current, 'New submission registered', `${submission.title} is ready for intake.`, `/submissions/${submission.id}`),
      };
    });
  }, []);

  const reset = useCallback(() => setState(demoState), []);
  const setRole = useCallback((role: string) => setState(s => ({ ...s, role, displayName: roleNames[role] ?? s.displayName })), []);
  const updateConfig = useCallback((patch: Partial<Pick<State, 'sectors' | 'reviewers' | 'documents' | 'documentRequirements' | 'settings' | 'notifications'>>) => setState(s => ({ ...s, ...patch })), []);
  const setSettings = useCallback((patch: Partial<HubSettings>) => setState(s => ({ ...s, settings: { ...s.settings, ...patch } })), []);
  const addRequirement = useCallback((requirement: Omit<DocumentRequirement, 'id'>) => setState(s => ({ ...s, documentRequirements: [...s.documentRequirements, { id: uid('req'), ...requirement }] })), []);
  const removeRequirement = useCallback((id: string) => setState(s => ({ ...s, documentRequirements: s.documentRequirements.filter(r => r.id !== id) })), []);

  const initBrief = useCallback((id: string) => commit(id, (s, actor) => ({
    brief: { ...s.brief, initiatedBy: s.brief?.initiatedBy || actor, initiatedAt: s.brief?.initiatedAt || today() },
  }), 'Brief initiated', { title: 'Brief initiated', body: 'A staff member started the project brief.' }), [commit]);

  const completeBrief = useCallback((id: string) => commit(id, (s, actor) => ({
    brief: { ...s.brief, completedBy: actor, completedAt: today() },
  }), 'Brief completed', { title: 'Brief completed', body: 'The project brief has been marked complete.' }), [commit]);

  const submitBrief = useCallback((id: string) => commit(id, (s, actor) => ({
    brief: { ...s.brief, submittedBy: actor, submittedAt: today() }, stage: 'Registered' as Stage,
  }), 'Brief submitted', { title: 'Brief submitted', body: 'The completed brief is now part of the formal workflow.' }), [commit]);

  const saveAssessment = useCallback((id: string, checklist: ChecklistItem[], assessment: string) => commit(id, s => ({
    assessmentChecklist: checklist,
    assessment,
    stage: ['Received', 'Registered', 'Fact-Finding', 'Draft'].includes(s.stage) ? 'Awaiting Routing' as Stage : s.stage,
  }), 'Fact-finding assessment saved', { title: 'Fact-finding assessment saved', body: 'An assessment is ready for the next routing decision.' }), [commit]);

  const assignReview = useCallback((id: string, reviewer: string, role: string, mode: 'Sequential' | 'Parallel', sequence?: number) => commit(id, s => ({
    reviewers: Array.from(new Set([...s.reviewers, reviewer])),
    reviews: [
      ...s.reviews.filter(r => !(r.reviewer === reviewer && r.status !== 'Completed')),
      { id: uid('rev'), reviewer, role, status: 'Pending', note: '', date: today(), decision: 'Pending', mode, sequence: sequence ?? s.reviews.length + 1 },
    ],
  }), 'Reviewer assigned', { title: 'Reviewer assigned', body: `${reviewer} was added to the review team.` }), [commit]);

  const recordReview = useCallback((id: string, review: NewReview) => commit(id, (s, actor) => {
    const existing = s.reviews.find(r => r.reviewer === review.reviewer && r.status !== 'Completed');
    const record: Review = { ...review, id: review.id || uid('rev'), date: review.date || today(), status: 'Completed', completedAt: today(), role: review.role || actor, note: review.note || '' };
    return {
      reviews: existing ? s.reviews.map(r => r.id === existing.id ? { ...r, ...record } : r) : [...s.reviews, record],
    };
  }, 'Review recorded', { title: 'Review recorded', body: 'A reviewer submitted their observations.' }), [commit]);

  const submitToIP = useCallback((id: string, notes: string) => commit(id, (s, actor) => ({
    ip: [...(s.ip ?? []), { id: uid('ip'), submittedAt: today(), submittedBy: actor, status: 'Submitted', notes, feedback: '' }],
  }), 'Submitted to Intellectual Property', { title: 'IP submission recorded', body: 'The case was submitted to Intellectual Property.' }), [commit]);

  const updateIP = useCallback((id: string, ipId: string, patch: Partial<IPSubmission>) => commit(id, s => ({
    ip: (s.ip ?? []).map(record => record.id === ipId ? { ...record, ...patch } : record),
  }), 'IP record updated'), [commit]);

  const requestRefinement = useCallback((id: string, items: string[], message: string, due?: string) => commit(id, (s, actor) => {
    const request: RefinementRequest = {
      id: uid('rr'), requestedBy: actor, requestedAt: today(), due,
      items: items.map((label, i) => ({ id: `${uid('ri')}-${i}`, label, done: false })),
      message, status: 'Open',
    };
    return {
      refinementRequests: [...(s.refinementRequests ?? []), request],
      feedback: [...s.feedback, message, ...items].filter(Boolean),
      stage: 'Refinement Requested' as Stage,
    };
  }, 'Refinement requested', { title: 'Refinement requested', body: 'Specific improvements were requested for this case.' }), [commit]);

  const resolveRefinement = useCallback((id: string, requestId: string) => commit(id, (s, actor) => ({
    refinementRequests: (s.refinementRequests ?? []).map(r => r.id === requestId ? { ...r, status: 'Resolved' as const, resolvedAt: today(), resolvedBy: actor } : r),
    stage: 'Under Review' as Stage,
  }), 'Refinement resolved', { title: 'Refinement resolved', body: 'Requested changes were verified and the case moved forward.' }), [commit]);

  const resubmit = useCallback((id: string, response: string) => commit(id, (s, actor) => {
    const version = s.revisions + 1;
    return {
      revisions: version,
      revisionHistory: [...s.revisionHistory, { id: uid('revision'), date: today(), actor, response, version }],
      stage: 'Under Review' as Stage,
    };
  }, 'Revised brief resubmitted', { title: 'Revised brief resubmitted', body: 'A new version of the brief is ready for verification.' }), [commit]);

  const route = useCallback((id: string, sector: string, note: string) => commit(id, (s, actor) => ({
    sector,
    stage: 'Further Handling' as Stage,
    routing: [...s.routing, { id: uid('route'), previous: s.sector, destination: sector, actor, date: today(), note, status: 'Sent' }],
  }), `Routed to ${sector}`, { title: 'Case routed', body: `The case was forwarded to ${sector}.` }), [commit]);

  const respondRouting = useCallback((id: string, routeId: string, status: NonNullable<RoutingRecord['status']>, note?: string) => commit(id, s => {
    const routing = s.routing.map(r => r.id === routeId ? { ...r, status, note: note || r.note } : r);
    const stage: Stage = status === 'Accepted' ? 'Further Handling' : status === 'Declined' || status === 'Returned' ? 'Awaiting Routing' : s.stage;
    return { routing, stage, sector: status === 'Declined' ? '' : s.sector };
  }, `Routing ${status.toLowerCase()}`, { title: `Routing ${status.toLowerCase()}`, body: `A destination ${status.toLowerCase()} this case.` }), [commit]);

  const addDocument = useCallback((id: string, doc: Omit<DemoDocument, 'id'>) => commit(id, (s, actor) => {
    const record: DemoDocument = { id: uid('doc'), uploadedBy: actor, status: 'Submitted', notes: '', ...doc, added: doc.added || today() };
    return {
      docs: [...s.docs, record],
      documentRequests: (s.documentRequests ?? []).map(r => r.kind === record.kind && r.status === 'Open' ? { ...r, status: 'Provided' as const } : r),
    };
  }, 'Supporting document added', { title: 'Document added', body: 'A supporting document was added to this case.' }), [commit]);

  const verifyDocument = useCallback((id: string, docId: string, status: DemoDocument['status'], notes: string) => commit(id, (s, actor) => ({
    docs: s.docs.map(d => d.id === docId ? { ...d, status, notes, verifiedBy: actor, verifiedAt: today() } : d),
  }), 'Document status updated'), [commit]);

  const requestDocument = useCallback((id: string, kind: string, reason: string) => commit(id, (s, actor) => ({
    documentRequests: [...(s.documentRequests ?? []), { id: uid('dreq'), kind, reason, requestedBy: actor, requestedAt: today(), status: 'Open' }],
  }), `Requested ${kind}`, { title: 'Document requested', body: `${kind} was requested for this case.` }), [commit]);

  const markNotificationRead = useCallback((id: string) => setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })), []);
  const markAllRead = useCallback(() => setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) })), []);

  const value = useMemo(() => ({
    state, update, register, reset, setRole, updateConfig, setStage,
    initBrief, completeBrief, submitBrief, saveAssessment, assignReview, recordReview,
    submitToIP, updateIP, requestRefinement, resolveRefinement, resubmit,
    route, respondRouting, addDocument, verifyDocument, requestDocument,
    markNotificationRead, markAllRead, setSettings, addRequirement, removeRequirement,
  }), [state, update, register, reset, setRole, updateConfig, setStage, initBrief, completeBrief, submitBrief, saveAssessment, assignReview, recordReview, submitToIP, updateIP, requestRefinement, resolveRefinement, resubmit, route, respondRouting, addDocument, verifyDocument, requestDocument, markNotificationRead, markAllRead, setSettings, addRequirement, removeRequirement]);

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const value = useContext(HubContext);
  if (!value) throw new Error('useHub must be used inside HubProvider');
  return value;
}
