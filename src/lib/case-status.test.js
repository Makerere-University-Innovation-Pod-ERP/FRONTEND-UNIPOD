// @vitest-environment node
/**
 * These tests DO run. The repo-wide vitest failure (undici × Node 22) only
 * affects the jsdom environment, so pure-logic tests pinned to the node
 * environment execute normally — the workaround the Textile tests use.
 * Component tests in this feature remain unrunnable and are labelled so.
 */
import { describe, expect, it } from 'vitest';
import {
  areReviewsComplete,
  calendarDaysUntil,
  COORDINATOR_OUTCOMES,
  coordinatorNextStep,
  deadlineLabel,
  decisionLockedReason,
  findOutcome,
  projectCodePrefix,
  reviewProgressLabel,
} from './case-status';

const NOV_13 = new Date(2026, 10, 13, 9, 30);

describe('calendarDaysUntil', () => {
  it('counts whole local calendar days', () => {
    expect(calendarDaysUntil('2026-11-20', NOV_13)).toBe(7);
    expect(calendarDaysUntil('2026-11-14', NOV_13)).toBe(1);
    expect(calendarDaysUntil('2026-11-13', NOV_13)).toBe(0);
    expect(calendarDaysUntil('2026-11-12', NOV_13)).toBe(-1);
    expect(calendarDaysUntil('2026-10-30', NOV_13)).toBe(-14);
  });

  it('ignores the time of day on both sides', () => {
    expect(calendarDaysUntil('2026-11-20', new Date(2026, 10, 13, 0, 0, 1))).toBe(7);
    expect(calendarDaysUntil('2026-11-20', new Date(2026, 10, 13, 23, 59, 59))).toBe(7);
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(calendarDaysUntil('2026-12-01', new Date(2026, 10, 30))).toBe(1);
    expect(calendarDaysUntil('2027-01-01', new Date(2026, 11, 31))).toBe(1);
    expect(calendarDaysUntil('2028-03-01', new Date(2028, 1, 28))).toBe(2);
  });

  it('returns null for a missing or malformed date', () => {
    expect(calendarDaysUntil(null, NOV_13)).toBeNull();
    expect(calendarDaysUntil(undefined, NOV_13)).toBeNull();
    expect(calendarDaysUntil('', NOV_13)).toBeNull();
    expect(calendarDaysUntil('20 Nov 2026', NOV_13)).toBeNull();
    expect(calendarDaysUntil('2026-11-20T00:00:00Z', NOV_13)).toBeNull();
  });
});

describe('deadlineLabel', () => {
  it('labels and tones each band', () => {
    expect(deadlineLabel('2026-11-20', NOV_13)).toMatchObject({
      tone: 'neutral',
      label: 'Due in 7 days',
    });
    expect(deadlineLabel('2026-11-15', NOV_13)).toMatchObject({
      tone: 'attention',
      label: 'Due in 2 days',
    });
    expect(deadlineLabel('2026-11-14', NOV_13)).toMatchObject({
      tone: 'attention',
      label: 'Due tomorrow',
    });
    expect(deadlineLabel('2026-11-13', NOV_13)).toMatchObject({
      tone: 'attention',
      label: 'Due today',
    });
    expect(deadlineLabel('2026-10-30', NOV_13)).toMatchObject({
      tone: 'overdue',
      label: 'Overdue by 14 days',
    });
    expect(deadlineLabel(null, NOV_13)).toMatchObject({ tone: 'none', label: 'No due date set' });
  });

  it('uses the singular for one day', () => {
    expect(deadlineLabel('2026-11-12', NOV_13).label).toBe('Overdue by 1 day');
  });
});

describe('project codes', () => {
  it('prefixes by category', () => {
    expect(projectCodePrefix('student')).toBe('STU');
    expect(projectCodePrefix('general')).toBe('GEN');
    expect(projectCodePrefix(null)).toBe('GEN');
  });
});

describe('coordinator outcomes', () => {
  it('exposes exactly the three outcomes from the assignment document', () => {
    expect(COORDINATOR_OUTCOMES.map((outcome) => outcome.label)).toEqual([
      'Confirmed as project',
      'Needs more improvement',
      'Closed with a reason',
    ]);
  });

  it('maps each outcome onto an existing stage', () => {
    expect(findOutcome('confirmed')).toMatchObject({
      toStage: 'FORWARDED',
      generatesProjectCode: true,
      requiresReason: false,
    });
    expect(findOutcome('needs_improvement')).toMatchObject({
      toStage: 'REFINEMENT_REQUESTED',
      generatesProjectCode: false,
    });
    expect(findOutcome('closed')).toMatchObject({
      toStage: 'COMPLETED',
      outcomeStatus: 'CLOSED',
      requiresReason: true,
    });
    expect(findOutcome('nonsense')).toBeNull();
  });
});

describe('review progress', () => {
  const panel = (requiredReviews, completedReviews) => ({ requiredReviews, completedReviews });

  it('reports completion only when every required review is in', () => {
    expect(areReviewsComplete(panel(2, 1))).toBe(false);
    expect(areReviewsComplete(panel(2, 2))).toBe(true);
    expect(areReviewsComplete(panel(0, 0))).toBe(false);
    expect(areReviewsComplete(null)).toBe(false);
  });

  it('phrases the progress line', () => {
    expect(reviewProgressLabel(panel(2, 1))).toBe('1 of 2 reviews done');
    expect(reviewProgressLabel(panel(1, 1))).toBe('1 of 1 review done');
    expect(reviewProgressLabel(panel(0, 0))).toBe('No reviewers assigned yet.');
  });

  it('explains why the decision is locked', () => {
    expect(decisionLockedReason(panel(2, 1))).toBe(
      'Save decision is locked until all 2 required reviews are in (1 recorded).',
    );
    expect(decisionLockedReason(panel(1, 0))).toBe(
      'Save decision is locked until all 1 required review is in (0 recorded).',
    );
    expect(decisionLockedReason(panel(0, 0))).toBe(
      'Assign reviewers before a decision can be recorded.',
    );
  });
});

describe('coordinator next step', () => {
  it('offers reviewer assignment during fact-finding', () => {
    expect(coordinatorNextStep('FACT_FINDING', null)).toMatchObject({
      kind: 'assign',
      toStage: 'UNDER_REVIEW',
    });
  });

  it('locks the decision while reviews are outstanding', () => {
    const step = coordinatorNextStep('UNDER_REVIEW', { requiredReviews: 2, completedReviews: 1 });
    expect(step.kind).toBe('decision');
    expect(step.unlocked).toBe(false);
    expect(step.lockedReason).toContain('locked until all 2 required reviews');
  });

  it('unlocks the decision once the reviews are in', () => {
    const step = coordinatorNextStep('UNDER_REVIEW', { requiredReviews: 2, completedReviews: 2 });
    expect(step.unlocked).toBe(true);
    expect(step.lockedReason).toBeNull();
    expect(step.outcomes).toHaveLength(3);
  });

  it('hands off to the version flow while in refinement', () => {
    expect(coordinatorNextStep('REFINEMENT_REQUESTED', null)).toMatchObject({
      kind: 'receive-version',
      toStage: 'UNDER_REVIEW',
    });
  });

  it('offers nothing on stages the coordinator does not own', () => {
    for (const stage of ['DRAFT', 'RECEIVED', 'REGISTERED', 'FORWARDED', 'FURTHER_HANDLING']) {
      expect(coordinatorNextStep(stage, null).kind).toBe('none');
    }
    expect(coordinatorNextStep('COMPLETED', null).kind).toBe('terminal');
  });
});
