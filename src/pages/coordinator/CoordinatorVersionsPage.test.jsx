/**
 * UNVERIFIED — these tests have never been executed.
 *
 * `npm test` cannot start a jsdom worker in this repo: vitest fails with
 * `TypeError: Cannot read properties of undefined (reading 'bind')` from
 * node_modules/undici/lib/interceptor/decompress.js under Node v22.13.1. The
 * breakage pre-dates this branch and fixing it needs a dependency change,
 * which is out of scope.
 *
 * The behaviour that matters here IS verified, in src/services/coordinator.test.js
 * (node environment): appending a version, archiving the previous review
 * round against the version it judged, the fresh panel, and the request only
 * resolving when asked. What remains unverified is the rendering and the
 * compare controls.
 *
 * Note on ordering: these tests mutate shared mock fixtures. IH-26029 is read
 * before anything records against it.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordinatorVersionsPage } from './CoordinatorVersionsPage';

function renderVersions(id = 'IH-26029') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/coordinator/briefs/${id}/versions`]}>
        <Routes>
          <Route
            path="/coordinator/briefs/:id/versions"
            element={<CoordinatorVersionsPage token="test-token" onUnauthorized={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoordinatorVersionsPage — reading', () => {
  it('shows the brief summary and how many versions are on record', async () => {
    renderVersions();
    expect(await screen.findByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
    expect(screen.getByText('Brian Ssekandi')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('compares the latest two versions side by side by default', async () => {
    renderVersions();
    expect(await screen.findByLabelText('Earlier version')).toHaveValue('1');
    expect(screen.getByLabelText('Later version')).toHaveValue('2');
    expect(screen.getByText(/keep track of mothers after delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/lightweight follow-up workflow/i)).toBeInTheDocument();
  });

  it('marks changed fields as changed and unchanged ones as unchanged', async () => {
    renderVersions();
    await screen.findByText('What changed');
    expect(screen.getAllByText('Changed').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Unchanged').length).toBeGreaterThanOrEqual(1);
  });

  it('lists the version history newest first and never offers an edit control', async () => {
    renderVersions();
    const history = await screen.findByText('Everything on record');
    const panel = history.closest('section');
    expect(within(panel).getByText('v2')).toBeInTheDocument();
    expect(within(panel).getByText('v1')).toBeInTheDocument();
    expect(within(panel).getByText('Original submission.')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /edit|delete|remove/i })).toBeNull();
  });

  it('says there is nothing to compare on a single-version brief', async () => {
    renderVersions('IH-26027');
    expect(await screen.findByText('Nothing to compare yet')).toBeInTheDocument();
  });

  it('blocks recording on a brief that is not awaiting improvement', async () => {
    renderVersions('IH-26031');
    expect(
      await screen.findByText(/only be recorded while the brief is awaiting improvement/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record resubmission/i })).not.toBeInTheDocument();
  });

  it('shows a not-found state for an unknown brief', async () => {
    renderVersions('IH-00000');
    expect(
      await screen.findByText('No brief exists with the reference IH-00000.'),
    ).toBeInTheDocument();
  });
});

describe('CoordinatorVersionsPage — recording', () => {
  it('requires a description of what changed', async () => {
    const user = userEvent.setup();
    renderVersions('IH-26027');
    await user.click(await screen.findByRole('button', { name: /record resubmission/i }));
    expect(
      await screen.findByText('Say what changed in this version — at least 10 characters.'),
    ).toBeInTheDocument();
  });

  it('requires at least one addressed change', async () => {
    const user = userEvent.setup();
    renderVersions('IH-26027');
    await user.type(
      await screen.findByLabelText(/what changed in this version/i),
      'They added the quality-check process.',
    );
    await user.click(screen.getByRole('button', { name: /record resubmission/i }));
    expect(
      await screen.findByText('Tick at least one change this version addresses.'),
    ).toBeInTheDocument();
  });

  it('offers the requested changes as the checklist', async () => {
    renderVersions('IH-26027');
    expect(
      await screen.findByRole('checkbox', { name: /Say who records and checks the audio summaries/ }),
    ).toBeInTheDocument();
  });

  it('defaults to resolving the request but allows leaving it open', async () => {
    renderVersions('IH-26027');
    expect(
      await screen.findByRole('checkbox', { name: /mark the improvement request resolved/i }),
    ).toBeChecked();
  });

  it('records the version and reports the return to review', async () => {
    const user = userEvent.setup();
    renderVersions('IH-26027');
    await user.type(
      await screen.findByLabelText(/what changed in this version/i),
      'Added the quality-check process and named who records the summaries.',
    );
    await user.click(
      screen.getByRole('checkbox', { name: /Say who records and checks the audio summaries/ }),
    );
    await user.click(screen.getByRole('button', { name: /record resubmission/i }));

    expect(await screen.findByText('v2 is on record')).toBeInTheDocument();
    expect(screen.getByText(/the brief has returned to review/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this version is awaiting reviewer assignment/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assign reviewers/i })).toBeInTheDocument();
  });
});
