/**
 * Coordinator pipeline fixtures (Assignment 2).
 *
 * Case ids, codes and titles are kept identical to src/mocks/fixtures/
 * submissions.js and fixtures/reviewer.js so the coordinator screens and
 * Assignment 5's reviewer screens describe the same cases rather than two
 * parallel universes.
 *
 * Every person named here is fictional and comes from the Figma prototype or
 * the existing fixtures. No real UniPod department head appears in mock data.
 */

export const reviewerPool = [
  { id: 'rev-1', name: 'Dr. Miriam Nsubuga', department: 'Technical Assessment' },
  { id: 'rev-2', name: 'Peter Okello', department: 'Research & Innovation' },
  { id: 'rev-3', name: 'Amina Ssemanda', department: 'Academic Department' },
  { id: 'rev-4', name: 'Daniel Kato', department: 'Technical Assessment' },
  { id: 'rev-5', name: 'Esther Achieng', department: 'Research & Innovation' },
  { id: 'rev-6', name: 'Grace Namuli', department: 'Academic Department' },
];

const emptyPanel = {
  mode: 'parallel',
  requiredReviews: 0,
  completedReviews: 0,
  dueDate: null,
  assignments: [],
};

export const coordinatorBriefs = {
  'IH-26031': {
    id: 'IH-26031',
    code: 'STU-2026-001',
    title: 'Smart Irrigation Monitoring System',
    category: 'student',
    stage: 'UNDER_REVIEW',
    summary:
      'A low-cost sensor network that helps smallholder farms make more precise watering decisions.',
    purpose: 'Improve water efficiency for local growers.',
    problemAddressed: 'Manual irrigation schedules do not account for changing soil moisture.',
    responsibleOfficer: 'Sarah Kintu',
    submitterName: 'Lydia Nabirye',
    assignedSector: 'Technical Assessment',
    documentCount: 1,
    versions: 1,
    submittedAt: '2026-10-08',
    updatedAt: '2026-10-17',
    outcome: null,
    reviewPanel: {
      mode: 'parallel',
      requiredReviews: 2,
      completedReviews: 1,
      dueDate: '2026-10-30',
      assignments: [
        {
          reviewerId: 'rev-1',
          reviewerName: 'Dr. Miriam Nsubuga',
          mode: 'parallel',
          step: 1,
          of: 2,
          decisionStatus: 'recommended',
          assignedAt: '2026-10-17',
          dueDate: '2026-10-30',
        },
        {
          reviewerId: 'rev-2',
          reviewerName: 'Peter Okello',
          mode: 'parallel',
          step: 2,
          of: 2,
          decisionStatus: 'pending',
          assignedAt: '2026-10-17',
          dueDate: '2026-10-30',
        },
      ],
    },
  },
  'IH-26024': {
    id: 'IH-26024',
    code: 'STU-2026-005',
    title: 'Low-cost Water Quality Alert',
    category: 'student',
    stage: 'UNDER_REVIEW',
    summary: 'An early-warning prompt for communities without routine water testing nearby.',
    purpose: 'Make early water-quality concerns easier to flag.',
    problemAddressed: 'Routine testing is not always available close to source.',
    responsibleOfficer: 'Sarah Kintu',
    submitterName: 'David Kamoga',
    assignedSector: 'Research & Innovation',
    documentCount: 1,
    versions: 2,
    submittedAt: '2026-09-24',
    updatedAt: '2026-10-12',
    outcome: null,
    reviewPanel: {
      mode: 'sequential',
      requiredReviews: 2,
      completedReviews: 2,
      dueDate: '2026-10-26',
      assignments: [
        {
          reviewerId: 'rev-3',
          reviewerName: 'Amina Ssemanda',
          mode: 'sequential',
          step: 1,
          of: 2,
          decisionStatus: 'recommended',
          assignedAt: '2026-10-12',
          dueDate: '2026-10-26',
        },
        {
          reviewerId: 'rev-4',
          reviewerName: 'Daniel Kato',
          mode: 'sequential',
          step: 2,
          of: 2,
          decisionStatus: 'changes_needed',
          assignedAt: '2026-10-12',
          dueDate: '2026-10-26',
        },
      ],
    },
  },
  'IH-26029': {
    id: 'IH-26029',
    code: 'STU-2026-002',
    title: 'Maternal Health Follow-up Platform',
    category: 'student',
    stage: 'REFINEMENT_REQUESTED',
    summary: 'A lightweight follow-up workflow for community health teams supporting new mothers.',
    purpose: 'Improve continuity of postnatal care.',
    problemAddressed: 'Follow-up visits can be missed when records are fragmented.',
    responsibleOfficer: 'Sarah Kintu',
    submitterName: 'Brian Ssekandi',
    assignedSector: 'Academic Department',
    documentCount: 1,
    versions: 2,
    submittedAt: '2026-10-05',
    updatedAt: '2026-10-16',
    outcome: null,
    // Overdue case: the deadline from the Figma Refinement Workspace frame
    // (requested 16 Oct, due 30 Oct 2026) has passed.
    refinement: {
      requestedAt: '2026-10-16',
      dueDate: '2026-10-30',
      requestedBy: 'Sarah Kintu',
    },
    reviewPanel: {
      mode: 'parallel',
      requiredReviews: 1,
      completedReviews: 1,
      dueDate: '2026-10-16',
      assignments: [
        {
          reviewerId: 'rev-1',
          reviewerName: 'Dr. Miriam Nsubuga',
          mode: 'parallel',
          step: 1,
          of: 1,
          decisionStatus: 'changes_needed',
          assignedAt: '2026-10-11',
          dueDate: '2026-10-16',
        },
      ],
    },
  },
  // Second refinement case, from the same Figma frame (Inclusive Learning
  // Audio Notes · STU-2026-006). Its deadline is still ahead of today, so the
  // "Within deadline" filter and the "Overdue" filter each have one case.
  'IH-26027': {
    id: 'IH-26027',
    code: 'STU-2026-006',
    title: 'Inclusive Learning Audio Notes',
    category: 'student',
    stage: 'REFINEMENT_REQUESTED',
    summary:
      'Recorded lecture summaries for students who find dense written notes hard to work from.',
    purpose: 'Make course material easier to revise from.',
    problemAddressed: 'Written notes alone exclude students with reading difficulties.',
    responsibleOfficer: 'Sarah Kintu',
    submitterName: 'Patience Amongin',
    assignedSector: 'Academic Department',
    documentCount: 1,
    versions: 1,
    submittedAt: '2026-10-28',
    updatedAt: '2026-11-09',
    outcome: null,
    refinement: {
      requestedAt: '2026-11-09',
      dueDate: '2026-11-20',
      requestedBy: 'Sarah Kintu',
    },
    reviewPanel: {
      mode: 'parallel',
      requiredReviews: 1,
      completedReviews: 1,
      dueDate: '2026-11-09',
      assignments: [
        {
          reviewerId: 'rev-5',
          reviewerName: 'Esther Achieng',
          mode: 'parallel',
          step: 1,
          of: 1,
          decisionStatus: 'changes_needed',
          assignedAt: '2026-11-02',
          dueDate: '2026-11-09',
        },
      ],
    },
  },
  'IH-26030': {
    id: 'IH-26030',
    code: null,
    title: 'Community Waste-to-Energy Initiative',
    category: 'general',
    stage: 'FACT_FINDING',
    summary: 'A collection route that turns market organic waste into usable local energy.',
    purpose: 'Reduce landfill waste and create local energy.',
    problemAddressed: 'Markets lack a reliable pathway for organic waste.',
    responsibleOfficer: 'Sarah Kintu',
    submitterName: 'Community Energy Group',
    assignedSector: null,
    documentCount: 0,
    versions: 1,
    submittedAt: '2026-10-07',
    updatedAt: '2026-10-16',
    outcome: null,
    reviewPanel: { ...emptyPanel, assignments: [] },
  },
  'IH-26026': {
    id: 'IH-26026',
    code: 'STU-2026-004',
    title: 'Digital Heritage Preservation Project',
    category: 'student',
    stage: 'COMPLETED',
    summary: 'A consent-led way to record and share local heritage with the communities it belongs to.',
    purpose: 'Preserve and respectfully share local heritage.',
    problemAddressed: 'Valuable histories can be lost without consent-led preservation.',
    responsibleOfficer: 'Sarah Kintu',
    submitterName: 'Noah Kisakye',
    assignedSector: 'Research & Innovation',
    documentCount: 1,
    versions: 4,
    submittedAt: '2026-09-29',
    updatedAt: '2026-10-14',
    outcome: { status: 'CONFIRMED', reason: null, projectCode: 'STU-2026-004' },
    reviewPanel: {
      mode: 'parallel',
      requiredReviews: 2,
      completedReviews: 2,
      dueDate: '2026-10-13',
      assignments: [
        {
          reviewerId: 'rev-5',
          reviewerName: 'Esther Achieng',
          mode: 'parallel',
          step: 1,
          of: 2,
          decisionStatus: 'recommended',
          assignedAt: '2026-10-02',
          dueDate: '2026-10-13',
        },
        {
          reviewerId: 'rev-6',
          reviewerName: 'Grace Namuli',
          mode: 'parallel',
          step: 2,
          of: 2,
          decisionStatus: 'recommended',
          assignedAt: '2026-10-02',
          dueDate: '2026-10-13',
        },
      ],
    },
  },
};

/**
 * Written reviewer comments, kept in a SEPARATE map from the briefs above.
 *
 * The coordinator brief page (page 1) shows reviewer STATUS only; the decision
 * page (page 2) is the screen that summarises what each reviewer wrote. Holding
 * the text here rather than on the assignment objects means the
 * GET /coordinator/briefs/:id response physically cannot carry a comment, so
 * page 1 cannot leak one even by accident.
 *
 * Keyed `${briefId}:${reviewerId}`. Only recorded (non-pending) reviews have
 * an entry.
 */
export const reviewComments = {
  'IH-26031:rev-1': {
    comment:
      'Clear problem statement and the sensor choice is realistic for the budget. I would like to see the calibration plan before field deployment, but that is a project-stage concern, not a reason to hold the brief.',
    decidedAt: '2026-10-21',
  },
  'IH-26024:rev-3': {
    comment:
      'Worth taking forward. The alert thresholds need to cite a recognised water-quality standard rather than the team’s own figures, and the community hand-over plan is thin.',
    decidedAt: '2026-10-20',
  },
  'IH-26024:rev-4': {
    comment:
      'I support the direction but not the current scope. The brief covers three districts with one prototype; narrow it to one site, prove the alert works, then expand. Resubmit with a revised scope and I would recommend it.',
    decidedAt: '2026-10-23',
  },
  'IH-26029:rev-1': {
    comment:
      'The follow-up workflow duplicates the existing register in two places. Please clarify the intended user group and attach the implementation timeline before this goes further.',
    decidedAt: '2026-10-16',
  },
  'IH-26026:rev-5': {
    comment:
      'Strong consent process and the community partnership is already in place. Recommended without reservation.',
    decidedAt: '2026-10-11',
  },
  'IH-26026:rev-6': {
    comment:
      'Agreed. The archival format choice is sensible and the storage costs are accounted for.',
    decidedAt: '2026-10-13',
  },
  'IH-26027:rev-5': {
    comment:
      'The idea is sound but the brief does not say who records the summaries or how quality is checked. Please set that out before this goes any further.',
    decidedAt: '2026-11-09',
  },
};

/**
 * Next project-code sequence number per prefix and year. Mirrors the codes
 * already issued in the fixtures above (STU-2026-001, -002, -004, -005) so a
 * newly confirmed brief does not collide with one of them.
 */
export const projectCodeSequence = { 'STU-2026': 7, 'GEN-2026': 1 };

const pendingActionFor = (brief) => {
  switch (brief.stage) {
    case 'FACT_FINDING':
      return 'Assign reviewers';
    case 'UNDER_REVIEW':
      return brief.reviewPanel.completedReviews >= brief.reviewPanel.requiredReviews
        ? 'Ready for your decision'
        : `Awaiting ${brief.reviewPanel.requiredReviews - brief.reviewPanel.completedReviews} review(s)`;
    case 'REFINEMENT_REQUESTED':
      return 'Waiting on an improved version';
    case 'COMPLETED':
      return 'Closed';
    default:
      return 'No action needed';
  }
};

export const coordinatorQueue = () =>
  Object.values(coordinatorBriefs).map((brief) => ({
    id: brief.id,
    code: brief.code,
    title: brief.title,
    category: brief.category,
    stage: brief.stage,
    updatedAt: brief.updatedAt,
    pendingAction: pendingActionFor(brief),
  }));
