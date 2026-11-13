// @vitest-environment node
/**
 * These tests DO run (node environment — see case-status.test.js for why).
 *
 * They exercise the coordinator service against the MSW handlers, which is
 * where the contract between the page and the backend actually lives: Zod
 * parsing, the decision gate, project-code generation and the no-overwrite
 * rule. The component tests for these screens remain unrunnable under jsdom.
 */
import { describe, expect, it } from 'vitest';
import { coordinatorApi } from './coordinator';
import { ApiError } from './api-client';

const token = 'test-token';

describe('coordinator briefs', () => {
  it('lists the queue with a pending action per brief', async () => {
    const briefs = await coordinatorApi.briefs(token);
    expect(briefs.length).toBeGreaterThan(0);
    const irrigation = briefs.find((brief) => brief.id === 'IH-26031');
    expect(irrigation).toMatchObject({ code: 'STU-2026-001', stage: 'UNDER_REVIEW' });
    expect(irrigation.pendingAction).toBe('Awaiting 1 review(s)');
  });

  it('loads one brief with its review panel', async () => {
    const brief = await coordinatorApi.brief(token, 'IH-26031');
    expect(brief.reviewPanel).toMatchObject({ requiredReviews: 2, completedReviews: 1 });
    expect(brief.reviewPanel.assignments).toHaveLength(2);
    expect(brief.submitterName).toBe('Lydia Nabirye');
  });

  it('never exposes a reviewer comment on the brief endpoint', async () => {
    const brief = await coordinatorApi.brief(token, 'IH-26031');
    for (const assignment of brief.reviewPanel.assignments) {
      expect(assignment).not.toHaveProperty('comment');
    }
  });

  it('404s on an unknown brief', async () => {
    await expect(coordinatorApi.brief(token, 'IH-00000')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('ideas being improved', () => {
  it('returns only briefs awaiting an improved version', async () => {
    const items = await coordinatorApi.improvements(token);
    expect(items.map((item) => item.id).sort()).toEqual(['IH-26027', 'IH-26029']);
    for (const item of items) expect(item.stage).toBe('REFINEMENT_REQUESTED');
  });

  it('carries the applicant, the request date, the deadline and the version', async () => {
    const items = await coordinatorApi.improvements(token);
    const maternal = items.find((item) => item.id === 'IH-26029');
    expect(maternal).toMatchObject({
      code: 'STU-2026-002',
      submitterName: 'Brian Ssekandi',
      requestedAt: '2026-10-16',
      dueDate: '2026-10-30',
      versions: 2,
    });
    const audio = items.find((item) => item.id === 'IH-26027');
    expect(audio).toMatchObject({
      code: 'STU-2026-006',
      submitterName: 'Patience Amongin',
      dueDate: '2026-11-20',
      versions: 1,
    });
  });

  it('orders the queue by deadline, soonest first', async () => {
    const items = await coordinatorApi.improvements(token);
    const dates = items.map((item) => item.dueDate);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('ask for changes', () => {
  it('returns the written request with its changes, instructions and deadline', async () => {
    const view = await coordinatorApi.changesView(token, 'IH-26029');
    expect(view.refinement).toMatchObject({
      requestedBy: 'Sarah Kintu',
      requestedAt: '2026-10-16',
      dueDate: '2026-10-30',
      status: 'open',
    });
    expect(view.refinement.changes).toContain('Clarify the intended user group');
    expect(view.refinement.guidance).toContain('before resubmission');
    expect(view.canRequestChanges).toBe(false);
  });

  it('carries the review feedback alongside the request', async () => {
    const view = await coordinatorApi.changesView(token, 'IH-26029');
    expect(view.reviews).toHaveLength(1);
    expect(view.reviews[0]).toMatchObject({
      reviewerName: 'Dr. Miriam Nsubuga',
      decisionStatus: 'changes_needed',
    });
    expect(view.reviews[0].comment).toContain('duplicates the existing register');
  });

  it('offers the suggested checklist from the design', async () => {
    const view = await coordinatorApi.changesView(token, 'IH-26029');
    expect(view.suggestedChanges).toContain('Explain how the idea will be evaluated');
  });

  it('blocks writing a request on a brief that is not awaiting improvement', async () => {
    const view = await coordinatorApi.changesView(token, 'IH-26031');
    expect(view.refinement).toBeNull();
    expect(view.canRequestChanges).toBe(false);
    expect(view.blockedReason).toContain('once the brief is awaiting improvement');

    await expect(
      coordinatorApi.saveChangeRequest(token, 'IH-26031', {
        changes: ['Something'],
        guidance: 'Please improve this brief.',
        dueDate: '2026-12-01',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('refuses to overwrite a request already written', async () => {
    await expect(
      coordinatorApi.saveChangeRequest(token, 'IH-26029', {
        changes: ['Something else'],
        guidance: 'A different instruction entirely.',
        dueDate: '2026-12-01',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('404s on an unknown brief', async () => {
    await expect(coordinatorApi.changesView(token, 'IH-00000')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('writing a change request', () => {
  /**
   * Drives the whole loop on a brief that starts under review: decide "needs
   * more improvement", which moves it into refinement with no request, then
   * write the request. Uses IH-26028, which exists for exactly this flow so
   * the mutation does not disturb the decision tests below.
   */
  it('validates and then records the request, leaving reviews untouched', async () => {
    await coordinatorApi.recordDecision(token, 'IH-26028', {
      outcome: 'needs_improvement',
      reason: '',
    });

    const before = await coordinatorApi.changesView(token, 'IH-26028');
    expect(before.brief.stage).toBe('REFINEMENT_REQUESTED');
    expect(before.refinement).toBeNull();
    expect(before.canRequestChanges).toBe(true);

    // It appears in the improvement queue immediately, with no dates yet.
    const queued = await coordinatorApi.improvements(token);
    expect(queued.find((item) => item.id === 'IH-26028')).toMatchObject({
      requestedAt: null,
      dueDate: null,
    });

    await expect(
      coordinatorApi.saveChangeRequest(token, 'IH-26028', {
        changes: [],
        guidance: 'Please narrow the scope to one site.',
        dueDate: '2026-12-01',
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      coordinatorApi.saveChangeRequest(token, 'IH-26028', {
        changes: ['Narrow the scope to one site'],
        guidance: 'too short',
        dueDate: '2026-12-01',
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      coordinatorApi.saveChangeRequest(token, 'IH-26028', {
        changes: ['Narrow the scope to one site'],
        guidance: 'Please narrow the scope to one site and prove the alert works there first.',
        dueDate: '',
      }),
    ).rejects.toMatchObject({ status: 400 });

    const saved = await coordinatorApi.saveChangeRequest(token, 'IH-26028', {
      changes: ['Narrow the scope to one site', 'Cite a recognised water-quality standard'],
      guidance: 'Please narrow the scope to one site and prove the alert works there first.',
      dueDate: '2026-12-01',
    });

    expect(saved.refinement).toMatchObject({
      dueDate: '2026-12-01',
      requestedBy: 'Sarah Kintu',
      status: 'open',
    });
    expect(saved.refinement.changes).toHaveLength(2);
    expect(saved.canRequestChanges).toBe(false);
    expect(saved.reviews).toEqual(before.reviews);
    expect(saved.brief.versions).toBe(before.brief.versions);

    const afterQueue = await coordinatorApi.improvements(token);
    expect(afterQueue.find((item) => item.id === 'IH-26028')).toMatchObject({
      dueDate: '2026-12-01',
    });
  });
});

describe('decision view', () => {
  it('summarises every reviewer choice with its written comment', async () => {
    const view = await coordinatorApi.decisionView(token, 'IH-26024');
    expect(view.reviews).toHaveLength(2);
    expect(view.reviews[0]).toMatchObject({
      reviewerName: 'Amina Ssemanda',
      decisionStatus: 'recommended',
    });
    expect(view.reviews[0].comment).toContain('water-quality standard');
    expect(view.reviews[1].comment).toContain('narrow it to one site');
  });

  it('unlocks only when the required reviews are in and the brief is under review', async () => {
    await expect(coordinatorApi.decisionView(token, 'IH-26024')).resolves.toMatchObject({
      canRecordDecision: true,
      lockedReason: null,
    });

    const locked = await coordinatorApi.decisionView(token, 'IH-26031');
    expect(locked.canRecordDecision).toBe(false);
    expect(locked.lockedReason).toBe(
      'Save decision is locked until all 2 required reviews are in (1 recorded).',
    );

    const wrongStage = await coordinatorApi.decisionView(token, 'IH-26029');
    expect(wrongStage.canRecordDecision).toBe(false);
    expect(wrongStage.lockedReason).toContain('only be recorded while the brief is under review');
  });

  it('returns a null comment for a reviewer who has not submitted', async () => {
    const view = await coordinatorApi.decisionView(token, 'IH-26031');
    const pending = view.reviews.find((review) => review.decisionStatus === 'pending');
    expect(pending.comment).toBeNull();
    expect(pending.decidedAt).toBeNull();
  });
});

describe('recording a decision', () => {
  it('refuses a decision while reviews are outstanding', async () => {
    await expect(
      coordinatorApi.recordDecision(token, 'IH-26031', { outcome: 'confirmed', reason: '' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('refuses a closed decision with no written reason', async () => {
    await expect(
      coordinatorApi.recordDecision(token, 'IH-26024', { outcome: 'closed', reason: '' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuses an unknown outcome', async () => {
    await expect(
      coordinatorApi.recordDecision(token, 'IH-26024', { outcome: 'maybe', reason: '' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuses to overwrite a decision already on record', async () => {
    await expect(
      coordinatorApi.recordDecision(token, 'IH-26026', { outcome: 'confirmed', reason: '' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('confirms a brief, generates a project code and keeps the reviews intact', async () => {
    const before = await coordinatorApi.brief(token, 'IH-26024');
    const updated = await coordinatorApi.recordDecision(token, 'IH-26024', {
      outcome: 'confirmed',
      reason: '',
    });

    expect(updated.stage).toBe('FORWARDED');
    expect(updated.outcome.status).toBe('CONFIRMED');
    expect(updated.outcome.projectCode).toMatch(/^STU-\d{4}-\d{3}$/);
    expect(updated.code).toBe(updated.outcome.projectCode);
    expect(updated.reviewPanel.assignments).toEqual(before.reviewPanel.assignments);
    expect(updated.versions).toBe(before.versions);

    // The no-overwrite rule now applies to this brief too.
    await expect(
      coordinatorApi.recordDecision(token, 'IH-26024', { outcome: 'closed', reason: 'changed mind' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
