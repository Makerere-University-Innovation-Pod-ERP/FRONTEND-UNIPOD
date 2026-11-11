/**
 * UNVERIFIED — these tests have never been executed.
 *
 * `npm test` cannot run in this repo at all: vitest fails to start any worker
 * with `TypeError: Cannot read properties of undefined (reading 'bind')` from
 * node_modules/undici/lib/interceptor/decompress.js under Node v22.13.1. That
 * breakage pre-dates this branch (it fails on origin/main with zero test files
 * executed) and fixing it needs a dependency change, which is out of scope
 * here. Treat every assertion below as unconfirmed until the toolchain is
 * repaired — see the handover notes.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordinatorBriefPage } from './CoordinatorBriefPage';

function renderPage(initialPath = '/coordinator/briefs/IH-26031') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/coordinator/briefs/:id"
            element={<CoordinatorBriefPage token="test-token" onUnauthorized={vi.fn()} />}
          />
          <Route
            path="/coordinator"
            element={<CoordinatorBriefPage token="test-token" onUnauthorized={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoordinatorBriefPage', () => {
  it('shows the review progress line for the selected brief', async () => {
    renderPage();
    expect(await screen.findByText('1 of 2 reviews done')).toBeInTheDocument();
  });

  it('shows each reviewer status but never a review comment', async () => {
    renderPage();
    expect(await screen.findByText('Dr. Miriam Nsubuga')).toBeInTheDocument();
    expect(screen.getByText('Peter Okello')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(
      screen.getByText(/written review comments are shown on the decision page/i),
    ).toBeInTheDocument();
  });

  it('keeps the decision outcomes locked until every required review is in', async () => {
    renderPage();
    const confirm = await screen.findByRole('button', { name: 'Confirmed as project' });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Needs more improvement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Closed with a reason' })).toBeDisabled();
    expect(
      screen.getByText('Save decision is locked until all 2 required reviews are in (1 recorded).'),
    ).toBeInTheDocument();
  });

  it('unlocks the decision outcomes once the required reviews are recorded', async () => {
    renderPage('/coordinator/briefs/IH-26029');
    // IH-26029 has 1 of 1 review recorded but sits at REFINEMENT_REQUESTED, so
    // the decision trio is not the next step — the version hand-off is.
    expect(
      await screen.findByRole('button', { name: 'Receive improved version' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmed as project' })).not.toBeInTheDocument();
  });

  it('shows no coordinator actions on a completed brief', async () => {
    renderPage('/coordinator/briefs/IH-26026');
    expect(
      await screen.findByText('This brief is closed. No further steps are available.'),
    ).toBeInTheDocument();
    expect(screen.getByText('STU-2026-004')).toBeInTheDocument();
  });

  it('rejects an empty reviewer selection', async () => {
    const user = userEvent.setup();
    renderPage();
    const assign = await screen.findByRole('button', { name: /assign reviewer/i });
    await user.click(assign);
    expect(await screen.findByText('Choose at least one reviewer.')).toBeInTheDocument();
  });

  it('rejects a due date in the past', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('1 of 2 reviews done');
    await user.click(screen.getByRole('checkbox', { name: /Amina Ssemanda/ }));
    const due = screen.getByLabelText('Due date');
    await user.clear(due);
    await user.type(due, '2020-01-01');
    await user.click(screen.getByRole('button', { name: /assign reviewer/i }));
    expect(await screen.findByText('The due date cannot be in the past.')).toBeInTheDocument();
  });

  it('rejects a required count higher than the number of reviewers', async () => {
    const user = userEvent.setup();
    renderPage('/coordinator/briefs/IH-26030');
    await screen.findByText('No reviewers assigned yet.');
    await user.click(screen.getByRole('checkbox', { name: /Esther Achieng/ }));
    const required = screen.getByLabelText('Reviews required');
    await user.clear(required);
    await user.type(required, '3');
    await user.click(screen.getByRole('button', { name: /assign reviewer/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Required reviews (3) cannot exceed the 1 reviewer assigned.'),
      ).toBeInTheDocument();
    });
  });

  it('disables a reviewer who is already assigned to the brief', async () => {
    renderPage();
    const alreadyAssigned = await screen.findByRole('checkbox', { name: /Dr. Miriam Nsubuga/ });
    expect(alreadyAssigned).toBeDisabled();
  });

  it('shows the step order only for sequential reviews', async () => {
    const user = userEvent.setup();
    renderPage('/coordinator/briefs/IH-26030');
    await screen.findByText('No reviewers assigned yet.');
    await user.click(screen.getByRole('checkbox', { name: /Esther Achieng/ }));
    expect(screen.queryByText('Step order')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Review mode'), 'sequential');
    expect(await screen.findByText('Step order')).toBeInTheDocument();
    expect(screen.getByText('step 1/1')).toBeInTheDocument();
  });

  it('shows an empty state when no brief is selected', async () => {
    renderPage('/coordinator');
    expect(await screen.findByText('Select a brief to open it.')).toBeInTheDocument();
  });
});
