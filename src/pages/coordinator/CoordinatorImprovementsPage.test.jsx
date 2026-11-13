/**
 * UNVERIFIED — these tests have never been executed.
 *
 * `npm test` still cannot run in this repo: vitest fails to start any worker
 * with `TypeError: Cannot read properties of undefined (reading 'bind')` from
 * node_modules/undici/lib/interceptor/decompress.js under Node v22.13.1. The
 * breakage pre-dates this branch and fixing it needs a dependency change,
 * which is out of scope. Treat every assertion below as unconfirmed.
 *
 * Note: the deadline assertions use fake timers pinned to 2026-11-13 so they
 * do not rot as the fixtures' dates pass. The date arithmetic itself is
 * covered by src/lib/case-status.test.js, which DOES run (node environment).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordinatorImprovementsPage } from './CoordinatorImprovementsPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/coordinator/improvements']}>
        <CoordinatorImprovementsPage token="test-token" onUnauthorized={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoordinatorImprovementsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 10, 13, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists both refinement cases with applicant, dates and version', async () => {
    renderPage();
    expect(await screen.findByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
    expect(screen.getByText('Inclusive Learning Audio Notes')).toBeInTheDocument();
    expect(screen.getByText('Brian Ssekandi')).toBeInTheDocument();
    expect(screen.getByText('Patience Amongin')).toBeInTheDocument();
    expect(screen.getByText('IH-26029 · STU-2026-002')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('shows overdue and within-deadline chips against the local calendar', async () => {
    renderPage();
    expect(await screen.findByText('Overdue by 14 days')).toBeInTheDocument();
    expect(screen.getByText('Due in 7 days')).toBeInTheDocument();
  });

  it('counts the queue, overdue and due-soon metrics', async () => {
    renderPage();
    expect(await screen.findByText('In this queue')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 cases')).toBeInTheDocument();
  });

  it('filters to overdue cases only', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Maternal Health Follow-up Platform');
    await user.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(screen.getByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
    expect(screen.queryByText('Inclusive Learning Audio Notes')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 cases')).toBeInTheDocument();
  });

  it('filters to cases within deadline only', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Maternal Health Follow-up Platform');
    await user.click(screen.getByRole('button', { name: 'Within deadline' }));
    expect(screen.getByText('Inclusive Learning Audio Notes')).toBeInTheDocument();
    expect(screen.queryByText('Maternal Health Follow-up Platform')).not.toBeInTheDocument();
  });

  it('searches by title and by reference', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    const box = await screen.findByLabelText('Search by title or reference');
    await user.type(box, 'audio');
    expect(screen.getByText('Inclusive Learning Audio Notes')).toBeInTheDocument();
    expect(screen.queryByText('Maternal Health Follow-up Platform')).not.toBeInTheDocument();
    await user.clear(box);
    await user.type(box, 'STU-2026-002');
    expect(screen.getByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
  });

  it('offers a way out of an empty search result', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    const box = await screen.findByLabelText('Search by title or reference');
    await user.type(box, 'zzzz');
    expect(screen.getByText('No cases match this search or filter.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear search and filters/i }));
    expect(screen.getByText('Maternal Health Follow-up Platform')).toBeInTheDocument();
  });

  it('links each case to its refinement request', async () => {
    renderPage();
    const links = await screen.findAllByRole('link', { name: /open request/i });
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/coordinator/briefs/'));
    expect(links).toHaveLength(2);
  });

  it('is read-only — no form controls beyond search and filters', async () => {
    renderPage();
    await screen.findByText('Maternal Health Follow-up Platform');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});
