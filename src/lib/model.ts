export type Category = 'Student Project' | 'General Innovation';
export type Stage = 'Draft' | 'Received' | 'Registered' | 'Fact-Finding' | 'Under Review' | 'Refinement Requested' | 'Awaiting Routing' | 'Further Handling' | 'Completed' | 'Not Pursued' | 'Withdrawn';
export type DocumentStatus = 'Submitted' | 'Verified' | 'Rejected' | 'Requested';
export type DemoDocument = {
  id: string; name: string; kind: string; size: string; added: string;
  uploadedBy?: string; status?: DocumentStatus; notes?: string; verifiedBy?: string; verifiedAt?: string;
};
export type Review = {
  id: string; reviewer: string; role: string; status: string; note: string; date: string;
  decision?: string; mode?: 'Sequential' | 'Parallel'; sequence?: number; due?: string; completedAt?: string;
};
export type Activity = { id: string; action: string; actor: string; date: string };
export type RoutingRecord = { id: string; previous: string; destination: string; actor: string; date: string; note: string; status?: 'Sent' | 'Accepted' | 'Declined' | 'Returned' };
export type RevisionRecord = { id: string; date: string; actor: string; response: string; version: number };
export type BriefLifecycle = {
  initiatedBy?: string; initiatedAt?: string;
  completedBy?: string; completedAt?: string;
  submittedBy?: string; submittedAt?: string;
};
export type IPSubmission = { id: string; submittedAt: string; submittedBy: string; status: string; notes: string; feedback: string };
export type ChecklistItem = { id: string; label: string; checked: boolean; note: string };
export type RefinementItem = { id: string; label: string; done: boolean };
export type RefinementRequest = {
  id: string; requestedBy: string; requestedAt: string; due?: string;
  items: RefinementItem[]; message: string; status: 'Open' | 'Resolved'; resolvedAt?: string; resolvedBy?: string;
};
export type DocumentRequest = { id: string; kind: string; reason: string; requestedBy: string; requestedAt: string; status: 'Open' | 'Provided' };
export type Notification = { id: string; title: string; body: string; link: string; date: string; read: boolean };
export type Submission = {
  id: string; title: string; summary: string; purpose: string; problem: string; outcome: string;
  category: Category; code?: string; codeProvisional?: boolean; codeAssignedAt?: string;
  submitter: string; email: string; studentNumber?: string; programme?: string; supervisor?: string;
  officer: string; receiver: string; stage: Stage; sector: string; reviewers: string[];
  docs: DemoDocument[]; reviews: Review[]; feedback: string[]; activities: Activity[];
  routing: RoutingRecord[]; revisionHistory: RevisionRecord[]; created: string; updated: string; revisions: number;
  assessment?: string; receivedAt?: string; brief?: BriefLifecycle; ip?: IPSubmission[];
  refinementRequests?: RefinementRequest[]; documentRequests?: DocumentRequest[];
  assessmentChecklist?: ChecklistItem[]; outcomeState?: string; outcomeReason?: string;
};
export type Reviewer = { id: string; name: string; role: string; sector: string; active?: boolean };
export type DocumentRequirement = { id: string; category: Category; kind: string; required: boolean; condition: string };
export type HubSettings = {
  codeFormat: string;
  codeAssignment: 'On receipt' | 'After fact-finding';
  reviewMode: 'Parallel' | 'Sequential';
  requiredReviewers: number;
  ipRequirement: 'Not required' | 'Optional' | 'Student projects' | 'All submissions';
  notificationsEnabled: boolean;
};
export type State = {
  submissions: Submission[]; reviewers: Reviewer[]; sectors: string[]; role: string; displayName: string;
  documents: string[]; documentRequirements: DocumentRequirement[]; notifications: Notification[]; settings: HubSettings;
};

export const defaultChecklist = (): ChecklistItem[] => [
  { id: 'title', label: 'Title is clear', checked: false, note: '' },
  { id: 'purpose', label: 'Purpose is defined', checked: false, note: '' },
  { id: 'evidence', label: 'Evidence is adequate', checked: false, note: '' },
  { id: 'category', label: 'Category is correct', checked: false, note: '' },
  { id: 'documents', label: 'Required documents present', checked: false, note: '' },
];

const reviewerList: Reviewer[] = [
  { id: 'r1', name: 'Dr. Miriam Nsubuga', role: 'Research reviewer', sector: 'Research & Innovation' },
  { id: 'r2', name: 'Peter Okello', role: 'Technical assessor', sector: 'Technical Assessment' },
  { id: 'r3', name: 'Grace Namuli', role: 'Programme reviewer', sector: 'Academic Department' },
  { id: 'r4', name: 'Daniel Kato', role: 'Innovation liaison', sector: 'Research & Innovation' },
  { id: 'r5', name: 'Amina Ssemanda', role: 'IP liaison', sector: 'Intellectual Property' },
];
type SeedRow = Omit<Submission, 'activities' | 'reviews' | 'feedback' | 'docs' | 'routing' | 'revisionHistory'>;
const seedRows: SeedRow[] = [
  { id:'IH-26031',title:'Smart Irrigation Monitoring System',summary:'A low-cost sensor network that helps smallholder farms make more precise watering decisions.',purpose:'Improve water efficiency for local growers.',problem:'Manual irrigation schedules do not account for changing soil moisture.',outcome:'A field-tested prototype and practical usage guide.',category:'Student Project',code:'STU-2026-001',submitter:'Lydia Nakanwagi',email:'lydia.nakanwagi@example.edu',studentNumber:'S24/1048',programme:'BSc Agricultural Engineering',supervisor:'Dr. Isaac Mugisha',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Under Review',sector:'Technical Assessment',reviewers:['Dr. Miriam Nsubuga','Peter Okello'],created:'2026-10-08',updated:'2026-10-17',revisions:0},
  { id:'IH-26030',title:'Community Waste-to-Energy Initiative',summary:'A neighborhood pilot exploring safe conversion of organic waste into usable biogas.',purpose:'Reduce landfill waste and create local energy.',problem:'Markets lack a reliable pathway for organic waste.',outcome:'A community feasibility plan with safety controls.',category:'General Innovation',submitter:'Kawanda Community Lab',email:'lab@example.org',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Fact-Finding',sector:'',reviewers:[],created:'2026-10-07',updated:'2026-10-16',revisions:0},
  { id:'IH-26029',title:'Maternal Health Follow-up Platform',summary:'A lightweight follow-up workflow for community health teams supporting new mothers.',purpose:'Improve continuity of postnatal care.',problem:'Follow-up visits can be missed when records are fragmented.',outcome:'A privacy-aware service blueprint for local clinics.',category:'Student Project',code:'STU-2026-002',submitter:'Brian Ssekitoleko',email:'brian.s@example.edu',studentNumber:'S23/0872',programme:'BSc Information Systems',supervisor:'Ms. Joan Nakato',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Refinement Requested',sector:'',reviewers:['Grace Namuli'],created:'2026-10-05',updated:'2026-10-16',revisions:1},
  { id:'IH-26028',title:'Solar-Powered Cold Storage',summary:'Modular solar refrigeration for produce aggregation points with limited grid access.',purpose:'Extend shelf life and improve market access.',problem:'Post-harvest losses rise where cold storage is unavailable.',outcome:'A costed implementation concept for one pilot site.',category:'General Innovation',submitter:'Green Harvest Cooperative',email:'hello@greenharvest.example',officer:'Joseph Lwanga',receiver:'Martha Akello',stage:'Awaiting Routing',sector:'',reviewers:['Peter Okello'],created:'2026-10-03',updated:'2026-10-15',revisions:0},
  { id:'IH-26027',title:'Campus Accessibility Mapping',summary:'An accessible map of routes, entrances, and facilities across campus.',purpose:'Make inclusive navigation easier for every visitor.',problem:'Accessibility information is difficult to find in one place.',outcome:'A verified map prototype and maintenance process.',category:'Student Project',code:'STU-2026-003',submitter:'Esther Achieng',email:'esther.a@example.edu',studentNumber:'S24/1193',programme:'BA Design',supervisor:'Mr. Paul Ssekandi',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Registered',sector:'',reviewers:[],created:'2026-10-02',updated:'2026-10-12',revisions:0},
  { id:'IH-26026',title:'Digital Heritage Preservation Project',summary:'A community-led archive of oral histories and locally held cultural material.',purpose:'Preserve and respectfully share local heritage.',problem:'Valuable histories can be lost without consent-led preservation.',outcome:'A community governance and digitization framework.',category:'Student Project',code:'STU-2026-004',submitter:'Noah Kisembo',email:'noah.k@example.edu',studentNumber:'S22/0641',programme:'BA History',supervisor:'Dr. Lydia Busingye',officer:'Joseph Lwanga',receiver:'Martha Akello',stage:'Completed',sector:'Research & Innovation',reviewers:['Dr. Miriam Nsubuga'],created:'2026-09-29',updated:'2026-10-14',revisions:0},
  { id:'IH-26025',title:'Accessible Market Price Bulletin',summary:'A voice-first way for local producers to share daily market price information.',purpose:'Support more informed selling decisions.',problem:'Price updates are often delayed or inaccessible.',outcome:'A tested content format and pilot operating model.',category:'General Innovation',submitter:'Kijani Digital Collective',email:'team@kijani.example',officer:'Joseph Lwanga',receiver:'Martha Akello',stage:'Fact-Finding',sector:'',reviewers:[],created:'2026-09-27',updated:'2026-10-13',revisions:0},
  { id:'IH-26024',title:'Low-cost Water Quality Alert',summary:'A simple field kit and reporting protocol for community water monitoring.',purpose:'Make early water-quality concerns easier to flag.',problem:'Routine testing is not always available close to source.',outcome:'A validated kit concept and escalation guide.',category:'Student Project',code:'STU-2026-005',submitter:'David Kiyingi',email:'david.k@example.edu',studentNumber:'S23/0926',programme:'BSc Environmental Science',supervisor:'Dr. Jane Kasaija',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Under Review',sector:'Research & Innovation',reviewers:['Daniel Kato'],created:'2026-09-24',updated:'2026-10-12',revisions:0},
  { id:'IH-26023',title:'Reusable Lab Materials Exchange',summary:'A campus exchange model for safely redistributing reusable teaching materials.',purpose:'Reduce avoidable procurement and laboratory waste.',problem:'Surplus materials are not visible to other departments.',outcome:'A safe reuse protocol with inventory pilot.',category:'General Innovation',submitter:'Faculty Green Office',email:'greenoffice@example.edu',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Registered',sector:'',reviewers:[],created:'2026-09-22',updated:'2026-10-10',revisions:0},
  { id:'IH-26022',title:'Inclusive Learning Audio Notes',summary:'A consent-based audio companion that helps students revisit lecture concepts.',purpose:'Offer flexible routes back into course material.',problem:'Some learners benefit from audio review outside class.',outcome:'A small accessibility-led pilot and evaluation plan.',category:'Student Project',code:'STU-2026-006',submitter:'Doreen Atim',email:'doreen.a@example.edu',studentNumber:'S24/1011',programme:'BEd Educational Technology',supervisor:'Ms. Ruth Lule',officer:'Joseph Lwanga',receiver:'Martha Akello',stage:'Refinement Requested',sector:'',reviewers:['Grace Namuli'],created:'2026-09-20',updated:'2026-10-09',revisions:1},
  { id:'IH-26021',title:'Local Language Crop Advisory',summary:'Short crop-care guidance delivered in locally relevant language formats.',purpose:'Make useful agricultural guidance easier to act on.',problem:'Advice is not always available in a familiar language.',outcome:'A small content pilot with community validation.',category:'General Innovation',submitter:'Nile Extension Network',email:'contact@nile.example',officer:'Sarah Kintu',receiver:'Martha Akello',stage:'Further Handling',sector:'Academic Department',reviewers:['Daniel Kato'],created:'2026-09-17',updated:'2026-10-08',revisions:0},
  { id:'IH-26020',title:'Rainwater Harvesting Design Kit',summary:'A modular educational kit for planning rainwater capture in learning spaces.',purpose:'Demonstrate accessible climate adaptation.',problem:'Practical planning tools are limited in local classrooms.',outcome:'A tested kit, guide, and classroom activity.',category:'Student Project',code:'STU-2026-007',submitter:'Mark Walusimbi',email:'mark.w@example.edu',studentNumber:'S22/0713',programme:'BSc Civil Engineering',supervisor:'Eng. Sarah Tendo',officer:'Joseph Lwanga',receiver:'Martha Akello',stage:'Received',sector:'',reviewers:[],created:'2026-10-18',updated:'2026-10-18',revisions:0},
];

const requirementSeed: DocumentRequirement[] = [
  { id: 'dr1', category: 'Student Project', kind: 'Project Brief', required: true, condition: 'Always required' },
  { id: 'dr2', category: 'Student Project', kind: 'Supporting Evidence', required: false, condition: 'When the brief needs context' },
  { id: 'dr3', category: 'Student Project', kind: 'Recommendation Letter', required: false, condition: 'When institutional support must be verified' },
  { id: 'dr4', category: 'General Innovation', kind: 'Project Brief', required: true, condition: 'Always required' },
  { id: 'dr5', category: 'General Innovation', kind: 'Supporting Evidence', required: false, condition: 'When the brief needs context' },
];

const settingsSeed: HubSettings = {
  codeFormat: 'STU-{year}-{seq}',
  codeAssignment: 'On receipt',
  reviewMode: 'Parallel',
  requiredReviewers: 2,
  ipRequirement: 'Optional',
  notificationsEnabled: true,
};

const notificationSeed: Notification[] = [
  { id: 'n1', title: 'Fact-finding assessment needed', body: '4 submissions are waiting for an assessment.', link: '/fact-finding', date: '2026-10-18', read: false },
  { id: 'n2', title: 'Refinement response received', body: 'Inclusive Learning Audio Notes has a revised brief.', link: '/refinement', date: '2026-10-17', read: false },
  { id: 'n3', title: 'IP feedback recorded', body: 'Digital Heritage Preservation Project has IP clearance.', link: '/submissions/IH-26026', date: '2026-10-14', read: true },
];

const refinementFor = (submission: SeedRow): RefinementRequest[] => submission.stage !== 'Refinement Requested' ? [] : [{
  id: `rr-${submission.id}`,
  requestedBy: submission.officer,
  requestedAt: submission.updated,
  due: '2026-10-30',
  items: [
    { id: 'rri1', label: 'Clarify the intended user group', done: false },
    { id: 'rri2', label: 'Add supporting context for the proposed approach', done: false },
    { id: 'rri3', label: 'Attach a short implementation timeline', done: false },
  ],
  message: 'Good direction. Please strengthen the brief with the items above before resubmission.',
  status: 'Open',
}];

const ipFor = (i: number, s: SeedRow): IPSubmission[] => {
  if (i === 0) return [{ id: `ip-${s.id}`, submittedAt: '2026-10-13', submittedBy: 'Amina Ssemanda', status: 'Under IP Review', notes: 'Submitted for a preliminary IP screening.', feedback: 'Awaiting a search report.' }];
  if (i === 5) return [{ id: `ip-${s.id}`, submittedAt: '2026-10-01', submittedBy: 'Amina Ssemanda', status: 'Cleared', notes: 'Submitted after fact-finding.', feedback: 'No conflicting claims identified. Cleared for further handling.' }];
  return [];
};

const docsFor = (i: number, s: SeedRow): DemoDocument[] => {
  const officer = s.officer;
  if (i % 3 === 0) return [{ id: `doc-${s.id}`, name: 'Project brief', kind: 'Project Brief', size: '1.4 MB', added: s.created, uploadedBy: officer, status: 'Verified', notes: 'Checked during fact-finding.', verifiedBy: officer, verifiedAt: s.updated }];
  if (i === 1) return [{ id: `doc-${s.id}`, name: 'Community feasibility notes', kind: 'Supporting Evidence', size: '860 KB', added: s.created, uploadedBy: officer, status: 'Submitted', notes: '' }];
  if (i === 4) return [{ id: `doc-${s.id}`, name: 'Accessibility brief', kind: 'Project Brief', size: '1.1 MB', added: s.created, uploadedBy: officer, status: 'Submitted', notes: '' }];
  return [];
};

const demoDocsRequest = (i: number, s: SeedRow): DocumentRequest[] => i === 4 ? [{ id: `dreq-${s.id}`, kind: 'Recommendation Letter', reason: 'Please add a short recommendation from the project supervisor.', requestedBy: s.officer, requestedAt: s.updated, status: 'Open' }] : [];

const seed: State = {
  submissions: seedRows.map((s, i) => {
    const base: Submission = {
      ...s,
      docs: docsFor(i, s),
      reviews: s.reviewers.map((name, j) => ({ id: `rev-${s.id}-${j}`, reviewer: name, role: 'Reviewer', status: i % 2 ? 'Completed' : 'In progress', note: i === 2 ? 'Clarify the intended evaluation group and add a brief implementation timeline.' : '', date: s.updated, mode: i % 2 ? 'Sequential' : 'Parallel', sequence: j + 1, decision: i % 2 ? 'Recommended' : 'Pending' })),
      feedback: s.stage === 'Refinement Requested' ? ['Clarify the intended user group.', 'Add supporting context for the proposed approach.'] : [],
      routing: s.sector ? [{ id: `route-${s.id}`, previous: '', destination: s.sector, actor: s.officer, date: s.updated, note: 'Illustrative seeded destination', status: 'Accepted' }] : [],
      revisionHistory: s.revisions ? [{ id: `revision-${s.id}`, date: s.updated, actor: s.officer, response: 'Initial refinement record from seeded demonstration data.', version: s.revisions }] : [],
      activities: [{ id: `act-${s.id}`, action: 'Submission registered', actor: s.officer, date: s.created }],
      receivedAt: s.created,
      brief: { initiatedBy: s.officer, initiatedAt: s.created, completedBy: s.officer, completedAt: s.created, submittedBy: s.officer, submittedAt: s.created },
      ip: ipFor(i, s),
      refinementRequests: refinementFor(s),
      documentRequests: demoDocsRequest(i, s),
      assessmentChecklist: defaultChecklist().map((item, idx) => ({ ...item, checked: i % 2 === 0 && idx < 3 })),
      outcomeState: s.stage === 'Completed' ? 'Completed' : 'In progress',
      outcomeReason: '',
      codeProvisional: Boolean(s.code),
      codeAssignedAt: s.code ? s.created : undefined,
    };
    return base;
  }),
  reviewers: reviewerList,
  sectors: ['Intellectual Property', 'Technical Assessment', 'Research & Innovation', 'Academic Department', 'External or Specialized Assessment', 'Other Sector'],
  role: 'Innovation coordinator', displayName: 'Sarah Kintu',
  documents: ['Project Brief', 'Recommendation Letter', 'Supporting Evidence', 'Technical Documentation', 'Other'],
  documentRequirements: requirementSeed,
  notifications: notificationSeed,
  settings: settingsSeed,
};

const withDefaults = (s: Submission): Submission => ({
  ...s,
  brief: s.brief ?? { initiatedBy: s.officer, initiatedAt: s.created, completedBy: s.officer, completedAt: s.created, submittedBy: s.officer, submittedAt: s.created },
  receivedAt: s.receivedAt ?? s.created,
  ip: s.ip ?? [],
  refinementRequests: s.refinementRequests ?? [],
  documentRequests: s.documentRequests ?? [],
  assessmentChecklist: s.assessmentChecklist ?? defaultChecklist(),
  outcomeState: s.outcomeState ?? (s.stage === 'Completed' ? 'Completed' : 'In progress'),
  outcomeReason: s.outcomeReason ?? '',
  codeProvisional: s.code ? (s.codeProvisional ?? false) : undefined,
  codeAssignedAt: s.code ? (s.codeAssignedAt ?? s.created) : undefined,
  reviews: (s.reviews ?? []).map(r => ({ mode: 'Parallel', ...r })),
  docs: (s.docs ?? []).map(d => ({ uploadedBy: s.officer, status: 'Submitted', notes: '', ...d })),
});

export const initialState = (): State => {
  try {
    const value = localStorage.getItem('innovation-hub-state');
    if (value) {
      const saved = JSON.parse(value) as Partial<State>;
      return {
        ...seed,
        ...saved,
        settings: { ...seed.settings, ...(saved.settings ?? {}) },
        documentRequirements: saved.documentRequirements ?? seed.documentRequirements,
        notifications: saved.notifications ?? seed.notifications,
        submissions: (saved.submissions ?? seed.submissions).map(withDefaults),
      };
    }
  } catch {}
  return { ...seed, submissions: seed.submissions.map(withDefaults) };
};
export const demoState: State = { ...seed, submissions: seed.submissions.map(withDefaults) };
