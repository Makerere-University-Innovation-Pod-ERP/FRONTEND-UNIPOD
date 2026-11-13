/**
 * UNVERIFIED — these tests have never been executed.
 *
 * `npm test` still cannot run in this repo: vitest fails to start any worker
 * with `TypeError: Cannot read properties of undefined (reading 'bind')` from
 * node_modules/undici/lib/interceptor/decompress.js under Node v22.13.1. The
 * breakage pre-dates this branch and fixing it needs a dependency change,
 * which is out of scope. Treat every assertion below as unconfirmed.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordinatorDecisionPage } from './CoordinatorDecisionPage';

function renderDecision(path = '/coordinator/briefs/IH-26024/decision') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/coordinator/briefs/:id/decision"
            element={<CoordinatorDecisionPage token="test-token" onUnauthorized={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoordinatorDecisionPage', () => {
  it('summarises every reviewer choice and their written comment', async () => {
    renderDecision();
    expect(await screen.findByText('Amina Ssemanda')).toBeInTheDocument();
    expect(screen.getByText('Daniel Kato')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Changes needed')).toBeInTheDocument();
    expect(screen.getByText(/recognised water-quality standard/i)).toBeInTheDocument();
    expect(screen.getByText(/narrow it to one site/i)).toBeInTheDocument();
  });

  it('offers the three outcomes in the assignment wording', async () => {
    renderDecision();
    expect(await screen.findByRole('radio', { name: /Confirmed as project/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Needs more improvement/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Closed with a reason/ })).toBeInTheDocument();
  });

  it('preselects the outcome passed in the query string', async () => {
    renderDecision('/coordinator/briefs/IH-26024/decision?outcome=closed');
    expect(await screen.findByRole('radio', { name: /Closed with a reason/ })).toBeChecked();
  });

  it('keeps the form locked while reviews are outstanding', async () => {
    renderDecision('/coordinator/briefs/IH-26031/decision');
    expect(
      await screen.findByText(
        'Save decision is locked until all 2 required reviews are in (1 recorded).',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save decision/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Confirmed as project/ })).toBeDisabled();
  });

  it('still shows the recorded comment on a locked brief', async () => {
    renderDecision('/coordinator/briefs/IH-26031/decision');
    expect(await screen.findByText(/calibration plan before field deployment/i)).toBeInTheDocument();
    expect(
      screen.getByText('No comment recorded — this reviewer has not submitted yet.'),
    ).toBeInTheDocument();
  });

  it('refuses to save a closed decision without a reason', async () => {
    const user = userEvent.setup();
    renderDecision();
    await user.click(await screen.findByRole('radio', { name: /Closed with a reason/ }));
    await user.click(screen.getByRole('button', { name: /save decision/i }));
    expect(await screen.findByText('A closed decision needs a written reason.')).toBeInTheDocument();
  });

  it('refuses a closed reason that is too short', async () => {
    const user = userEvent.setup();
    renderDecision();
    await user.click(await screen.findByRole('radio', { name: /Closed with a reason/ }));
    await user.type(screen.getByLabelText(/Reason for closing/), 'no');
    await user.click(screen.getByRole('button', { name: /save decision/i }));
    expect(
      await screen.findByText('Give a bit more detail — at least 10 characters.'),
    ).toBeInTheDocument();
  });

  it('requires an outcome to be chosen', async () => {
    const user = userEvent.setup();
    renderDecision();
    await screen.findByRole('radio', { name: /Confirmed as project/ });
    await user.click(screen.getByRole('button', { name: /save decision/i }));
    expect(await screen.findByText('Choose an outcome.')).toBeInTheDocument();
  });

  it('generates and displays the project code when confirmed', async () => {
    const user = userEvent.setup();
    renderDecision();
    await user.click(await screen.findByRole('radio', { name: /Confirmed as project/ }));
    await user.click(screen.getByRole('button', { name: /save decision/i }));
    expect(await screen.findByText('The decision has been recorded.')).toBeInTheDocument();
    expect(screen.getByText('Project code')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/^STU-\d{4}-\d{3}$/)).toBeInTheDocument();
    });
  });

  it('saves a needs-more-improvement outcome without generating a code', async () => {
    const user = userEvent.setup();
    renderDecision();
    await user.click(await screen.findByRole('radio', { name: /Needs more improvement/ }));
    await user.click(screen.getByRole('button', { name: /save decision/i }));
    expect(await screen.findByText('The decision has been recorded.')).toBeInTheDocument();
    expect(screen.queryByText('Project code')).not.toBeInTheDocument();
  });

  it('shows a decision already on record instead of the form', async () => {
    renderDecision('/coordinator/briefs/IH-26026/decision');
    expect(await screen.findByText('DECISION ON RECORD')).toBeInTheDocument();
    expect(screen.getByText('STU-2026-004')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save decision/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/a recorded decision cannot be edited or replaced/i),
    ).toBeInTheDocument();
  });
});
