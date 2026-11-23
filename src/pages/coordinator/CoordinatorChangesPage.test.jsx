/**
 * UNVERIFIED — these tests have never been executed.
 *
 * `npm test` cannot start a jsdom worker in this repo: vitest fails with
 * `TypeError: Cannot read properties of undefined (reading 'bind')` from
 * node_modules/undici/lib/interceptor/decompress.js under Node v22.13.1. The
 * breakage pre-dates this branch and fixing it needs a dependency change,
 * which is out of scope.
 *
 * The contract behind this screen IS verified, in src/services/coordinator.test.js
 * (node environment): the request shape, the validation rules, the
 * no-overwrite rule and the full decide -> write-request loop all run there.
 * What remains unverified here is the rendering and the form wiring.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordinatorChangesPage } from './CoordinatorChangesPage';
import { coordinatorBriefs } from '@/mocks/fixtures/coordinator';

// If the fake-timers test below fails before reaching its own
// `vi.useRealTimers()` call, every test after it in this file would run
// under frozen timers — breaking Testing Library's `findBy*` polling and
// causing unrelated tests to time out. Guarantee real timers regardless of
// how that one test ends.
afterEach(() => {
  vi.useRealTimers();
});

function renderChanges(id = 'IH-26029') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/coordinator/briefs/${id}/changes`]}>
        <Routes>
          <Route
            path="/coordinator/briefs/:id/changes"
            element={<CoordinatorChangesPage token="test-token" onUnauthorized={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoordinatorChangesPage — recorded request', () => {
  it('shows the brief summary with applicant, version and status', async () => {
    renderChanges();
    expect(await screen.findByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
    expect(screen.getByText('IH-26029 · STU-2026-002')).toBeInTheDocument();
    expect(screen.getByText('Brian Ssekandi')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('shows the reviewer decision and comment', async () => {
    renderChanges();
    expect(await screen.findByText('Dr. Miriam Nsubuga')).toBeInTheDocument();
    expect(screen.getByText('Changes needed')).toBeInTheDocument();
    expect(screen.getByText(/duplicates the existing register/i)).toBeInTheDocument();
  });

  it('lists the required improvements and the instructions', async () => {
    renderChanges();
    expect(await screen.findByText('Clarify the intended user group')).toBeInTheDocument();
    expect(screen.getByText('Attach supporting evidence')).toBeInTheDocument();
    expect(screen.getByText(/strengthen the brief with the items above/i)).toBeInTheDocument();
  });

  it('shows the deadline with an overdue indicator', async () => {
    // `shouldAdvanceTime` lets real wall-clock time keep driving async
    // polling (Testing Library's `findBy*`/`waitFor`) while `Date`/`now()`
    // still report the pinned system time — plain `useFakeTimers()` freezes
    // timers outright and `findByText` below would hang until this test's
    // own timeout, never actually failing on the real assertion.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 10, 13));
    renderChanges();
    expect(await screen.findByText('Overdue by 14 days')).toBeInTheDocument();
  });

  it('does not offer the form when a request already exists', async () => {
    renderChanges();
    await screen.findByText('What the applicant must change');
    expect(
      screen.queryByRole('button', { name: /save refinement request/i }),
    ).not.toBeInTheDocument();
  });

  it('offers all three actions', async () => {
    renderChanges();
    // "Back to Ideas Being Improved" lives in the page header and renders
    // immediately; the other two are inside the brief panel, which is still
    // behind its own loading state at this point — wait for each.
    expect(
      await screen.findByRole('link', { name: /back to ideas being improved/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /view submission/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /record the improved version/i }),
    ).toBeInTheDocument();
  });
});

describe('CoordinatorChangesPage — blocked', () => {
  it('explains why a request cannot be written on a brief under review', async () => {
    renderChanges('IH-26031');
    expect(
      await screen.findByText(/once the brief is awaiting improvement/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /save refinement request/i }),
    ).not.toBeInTheDocument();
  });

  it('disables the resubmission action with a reason', async () => {
    renderChanges('IH-26031');
    const button = await screen.findByRole('button', { name: /record the improved version/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText('Available once an improvement request has been written.'),
    ).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown brief', async () => {
    renderChanges('IH-00000');
    expect(await screen.findByText('No brief exists with the reference IH-00000.')).toBeInTheDocument();
  });
});

describe('CoordinatorChangesPage — writing a request', () => {
  // Every test in this block decides IH-26028 for real (a genuine POST
  // against the mock handler, which mutates the shared, module-level
  // `coordinatorBriefs` fixture in place). Snapshot and restore it around
  // each test so they don't see each other's decisions — the handler
  // refuses to re-decide a brief that's already been decided.
  const pristineBrief = structuredClone(coordinatorBriefs['IH-26028']);
  beforeEach(() => {
    coordinatorBriefs['IH-26028'] = structuredClone(pristineBrief);
  });
  afterEach(() => {
    coordinatorBriefs['IH-26028'] = structuredClone(pristineBrief);
  });

  /** IH-26028 is under review; deciding it into refinement opens the form. */
  async function openForm() {
    const { coordinatorApi } = await import('@/services/coordinator');
    await coordinatorApi.recordDecision('test-token', 'IH-26028', {
      outcome: 'needs_improvement',
      reason: '',
    });
    renderChanges('IH-26028');
    return screen.findByText('Request specific improvements');
  }

  it('offers the suggested checklist from the design', async () => {
    await openForm();
    expect(screen.getByRole('checkbox', { name: 'Clarify the intended user group' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Explain how the idea will be evaluated' })).toBeInTheDocument();
  });

  it('requires at least one change', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.type(
      screen.getByLabelText(/instructions to the applicant/i),
      'Please address the points raised by the reviewer.',
    );
    await user.click(screen.getByRole('button', { name: /save refinement request/i }));
    expect(
      await screen.findByText('List at least one change the applicant must make.'),
    ).toBeInTheDocument();
  });

  it('requires written instructions', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.click(screen.getByRole('checkbox', { name: 'Attach supporting evidence' }));
    await user.click(screen.getByRole('button', { name: /save refinement request/i }));
    expect(
      await screen.findByText('Write instructions for the applicant — at least 10 characters.'),
    ).toBeInTheDocument();
  });

  it('rejects a due date in the past', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.click(screen.getByRole('checkbox', { name: 'Attach supporting evidence' }));
    await user.type(
      screen.getByLabelText(/instructions to the applicant/i),
      'Please attach the evidence referenced in the brief.',
    );
    await user.type(screen.getByLabelText(/improved version due by/i), '2020-01-01');
    await user.click(screen.getByRole('button', { name: /save refinement request/i }));
    expect(await screen.findByText('The due date cannot be in the past.')).toBeInTheDocument();
  });

  it('lets the coordinator add a change of their own', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.type(screen.getByLabelText('Add another change'), 'Name the price source');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('checkbox', { name: 'Name the price source' })).toBeChecked();
  });

  it('saves the request and then shows it as recorded', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.click(screen.getByRole('checkbox', { name: 'Attach supporting evidence' }));
    await user.type(
      screen.getByLabelText(/instructions to the applicant/i),
      'Please name the price source and say how often it is refreshed.',
    );
    await user.type(screen.getByLabelText(/improved version due by/i), '2026-12-01');
    await user.click(screen.getByRole('button', { name: /save refinement request/i }));
    expect(await screen.findByText('What the applicant must change')).toBeInTheDocument();
    expect(screen.getByText(/name the price source and say how often/i)).toBeInTheDocument();
  });
});
