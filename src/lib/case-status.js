/**
 * Shared brief/case status model for the Innovation Coordinator pipeline
 * (Assignment 2) and the Reviewer / department-intake screens (Assignment 5).
 *
 * This file is deliberately ADDITIVE: it describes the stage values that
 * already exist in the app (see src/mocks/fixtures/submissions.js and
 * services/backend-api.js) and the transitions the coordinator is allowed to
 * drive. It does not introduce a competing status model and it does not add a
 * new stage value.
 *
 * ASSUMPTION — pending project-owner confirmation (assignment doc, Section 9
 * item 6). The three coordinator outcomes map onto existing stages as:
 *   Confirmed as project  -> FORWARDED               (+ project code generated)
 *   Needs more improvement-> REFINEMENT_REQUESTED
 *   Closed with a reason  -> COMPLETED, with outcome { status: 'CLOSED', reason }
 * There is no CLOSED stage; a closed brief is COMPLETED carrying a CLOSED
 * outcome, so the shared enum stays compatible with Assignment 5 and the
 * backend contract.
 */

export const STAGES = [
  'DRAFT',
  'RECEIVED',
  'REGISTERED',
  'FACT_FINDING',
  'UNDER_REVIEW',
  'REFINEMENT_REQUESTED',
  'FORWARDED',
  'FURTHER_HANDLING',
  'COMPLETED',
];

/** Reviewer decision values — identical to Assignment 5's reviewer service. */
export const REVIEW_DECISION_STATUSES = [
  'pending',
  'recommended',
  'changes_needed',
  'not_recommended',
];

export const REVIEW_MODES = ['parallel', 'sequential'];

/** The coordinator's three decision outcomes, in the assignment doc's wording. */
export const COORDINATOR_OUTCOMES = [
  {
    id: 'confirmed',
    label: 'Confirmed as project',
    toStage: 'FORWARDED',
    outcomeStatus: 'CONFIRMED',
    requiresReason: false,
    generatesProjectCode: true,
  },
  {
    id: 'needs_improvement',
    label: 'Needs more improvement',
    toStage: 'REFINEMENT_REQUESTED',
    outcomeStatus: 'REFINEMENT_REQUESTED',
    requiresReason: false,
    generatesProjectCode: false,
  },
  {
    id: 'closed',
    label: 'Closed with a reason',
    toStage: 'COMPLETED',
    outcomeStatus: 'CLOSED',
    requiresReason: true,
    generatesProjectCode: false,
  },
];

/**
 * Transitions the coordinator may drive from each stage. Stages the coordinator
 * does not own map to an empty list, so the next-step box renders nothing but
 * an explanation.
 */
export const COORDINATOR_TRANSITIONS = {
  DRAFT: [],
  RECEIVED: [],
  REGISTERED: [],
  FACT_FINDING: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['FORWARDED', 'REFINEMENT_REQUESTED', 'COMPLETED'],
  REFINEMENT_REQUESTED: ['UNDER_REVIEW'],
  FORWARDED: [],
  FURTHER_HANDLING: [],
  COMPLETED: [],
};

/** True when every required review has been recorded (none still pending). */
export function areReviewsComplete(panel) {
  if (!panel) return false;
  const required = Number(panel.requiredReviews ?? 0);
  const completed = Number(panel.completedReviews ?? 0);
  return required > 0 && completed >= required;
}

/** "1 of 2 reviews done" — the coordinator's progress line. */
export function reviewProgressLabel(panel) {
  if (!panel || !panel.requiredReviews) return 'No reviewers assigned yet.';
  const required = Number(panel.requiredReviews);
  const completed = Number(panel.completedReviews ?? 0);
  return `${completed} of ${required} ${required === 1 ? 'review' : 'reviews'} done`;
}

/**
 * Project-code prefix by submission category.
 *
 * ASSUMPTION — pending Innovation Coordinator confirmation (assignment doc,
 * Section 9 item 5). Assumed format PREFIX-YYYY-NNN, e.g. STU-2026-001. The
 * code itself is generated server-side (mocked in coordinator-handlers.js);
 * the frontend only displays what the API returns.
 */
export function projectCodePrefix(category) {
  return category === 'student' ? 'STU' : 'GEN';
}

/**
 * Whole calendar days from today until `dueDate` (negative when overdue).
 *
 * Deliberately NOT a millisecond subtraction: `new Date('2026-11-20')` parses
 * as UTC midnight, so in any timezone behind UTC a naive diff is off by one,
 * and a 24h-based diff drifts across a daylight-saving boundary. Both dates
 * are reduced to their local calendar Y/M/D first, then compared as UTC
 * midnights, so 13 Nov → 20 Nov is exactly 7 everywhere.
 *
 * `dueDate` is an ISO date string (YYYY-MM-DD). Returns null if absent or
 * malformed.
 */
export function calendarDaysUntil(dueDate, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dueDate ?? ''));
  if (!match) return null;
  const due = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - now) / 86_400_000);
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The deadline chip for a refinement case.
 * tone: 'overdue' | 'attention' | 'neutral' | 'none' — paired with an icon and
 * text at the call site so the state is never signalled by colour alone.
 */
export function deadlineLabel(dueDate, today = new Date()) {
  const days = calendarDaysUntil(dueDate, today);
  if (days === null) return { tone: 'none', days: null, label: 'No due date set' };
  if (days < 0) return { tone: 'overdue', days, label: `Overdue by ${plural(-days, 'day')}` };
  if (days === 0) return { tone: 'attention', days, label: 'Due today' };
  if (days === 1) return { tone: 'attention', days, label: 'Due tomorrow' };
  return {
    tone: days <= 2 ? 'attention' : 'neutral',
    days,
    label: `Due in ${plural(days, 'day')}`,
  };
}

/** Looks up one of the three coordinator outcomes by id. */
export function findOutcome(outcomeId) {
  return COORDINATOR_OUTCOMES.find((outcome) => outcome.id === outcomeId) ?? null;
}

/** The reason shown on the disabled decision controls. */
export function decisionLockedReason(panel) {
  const required = Number(panel?.requiredReviews ?? 0);
  const completed = Number(panel?.completedReviews ?? 0);
  if (required === 0) return 'Assign reviewers before a decision can be recorded.';
  return `Save decision is locked until all ${required} required ${
    required === 1 ? 'review is' : 'reviews are'
  } in (${completed} recorded).`;
}

/**
 * Describes the next-step box for a stage. Returns a descriptor rather than
 * JSX so the Reviewer/department screens can reuse the same rules.
 *
 * kind: 'none' | 'assign' | 'decision' | 'receive-version' | 'terminal'
 */
export function coordinatorNextStep(stage, panel) {
  switch (stage) {
    case 'DRAFT':
    case 'RECEIVED':
    case 'REGISTERED':
      return { kind: 'none', note: "This brief hasn't reached the coordinator yet." };
    case 'FACT_FINDING':
      return {
        kind: 'assign',
        note: 'Assign reviewers to move this brief into review.',
        toStage: 'UNDER_REVIEW',
      };
    case 'UNDER_REVIEW': {
      const unlocked = areReviewsComplete(panel);
      return {
        kind: 'decision',
        unlocked,
        lockedReason: unlocked ? null : decisionLockedReason(panel),
        outcomes: COORDINATOR_OUTCOMES,
      };
    }
    case 'REFINEMENT_REQUESTED':
      return {
        kind: 'receive-version',
        note: 'Waiting on an improved version from the submitter.',
        toStage: 'UNDER_REVIEW',
      };
    case 'FORWARDED':
      return { kind: 'none', note: 'This brief has moved on to the responsible department.' };
    case 'FURTHER_HANDLING':
      return { kind: 'none', note: 'This brief is being handled outside the coordinator pipeline.' };
    case 'COMPLETED':
      return { kind: 'terminal', note: 'This brief is closed. No further steps are available.' };
    default:
      return { kind: 'none', note: 'No coordinator action is available for this status.' };
  }
}
