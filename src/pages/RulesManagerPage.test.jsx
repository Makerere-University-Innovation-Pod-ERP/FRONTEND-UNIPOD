import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RulesManagerPage } from './RulesManagerPage';
import { resetMockRules, rulesApi } from '@/services/rules';

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
  resetMockRules();
  localStorage.removeItem('unipod.rules.v1');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RulesManagerPage token="test-token" />
    </QueryClientProvider>,
  );
}

describe('RulesManagerPage', () => {
  it('lists the seeded rules with their scope and published state', async () => {
    renderPage();

    const row = await screen.findByRole('row', { name: /originality and attribution/i });
    expect(within(row).getByText('General')).toBeInTheDocument();
    expect(within(row).getByText('Published')).toBeInTheDocument();

    const sectorRow = screen.getByRole('row', { name: /technical assessment turnaround/i });
    expect(within(sectorRow).getByText('Technical Assessment')).toBeInTheDocument();
  });

  it('creates a new general rule as a draft, then publishes it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /originality and attribution/i });

    await user.click(screen.getByRole('button', { name: /new rule/i }));
    await user.type(screen.getByLabelText(/^title/i), 'Equipment liability');
    await user.type(screen.getByLabelText(/^wording/i), 'The submitter is liable for damage caused by misuse of lent equipment.');
    await user.click(screen.getByRole('button', { name: /create as draft/i }));

    const row = await screen.findByRole('row', { name: /equipment liability/i });
    expect(within(row).getByText('Draft')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: /publish/i }));
    expect(await within(row).findByText('Published')).toBeInTheDocument();
    expect(localStorage.getItem('unipod.rules.v1')).toBeNull();
  });

  it('keeps a rule as a draft when only its wording is edited', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /originality and attribution/i });

    await user.click(screen.getByRole('button', { name: /new rule/i }));
    await user.type(screen.getByLabelText(/^title/i), 'Lab access hours');
    await user.type(screen.getByLabelText(/^wording/i), 'The lab is open 9am to 5pm on weekdays.');
    await user.click(screen.getByRole('button', { name: /create as draft/i }));

    const row = await screen.findByRole('row', { name: /lab access hours/i });
    expect(within(row).getByText('Draft')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    const wording = screen.getByLabelText(/^wording/i);
    await user.clear(wording);
    await user.type(wording, 'The lab is open 9am to 6pm on weekdays.');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(within(row).getByText('Draft')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: /preview/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('The lab is open 9am to 6pm on weekdays.')).toBeInTheDocument();
  });

  it('keeps a published rule published when only its wording is edited', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /impartial review/i });
    await user.click(within(row).getByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    const revisedWording = 'Reviews must use evidence-based reasoning and disclose any conflict of interest before a decision.';
    const wording = screen.getByLabelText(/^wording/i);
    await user.clear(wording);
    await user.type(wording, revisedWording);

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(within(row).getByText('Published')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: /preview/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(revisedWording)).toBeInTheDocument();
  });

  it('retires a published rule', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /good-faith participation/i });
    await user.click(within(row).getByRole('button', { name: /retire/i }));

    expect(await within(row).findByText('Draft')).toBeInTheDocument();
  });

  it('previews a rule the way submitters and reviewers will see it', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /originality and attribution/i });
    await user.click(within(row).getByRole('button', { name: /preview/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/must not infringe existing intellectual property/i)).toBeInTheDocument();
  });

  it('uses the backend rules API outside mock mode and ignores local storage', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENABLE_MOCKS', 'false');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);
    const storedRules = JSON.stringify([{ id: 'browser-rule', title: 'Untrusted', body: 'Not authoritative.' }]);
    localStorage.setItem('unipod.rules.v1', storedRules);

    await expect(rulesApi.list('test-token')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rules'),
      expect.objectContaining({ headers: expect.anything() }),
    );
    expect(localStorage.getItem('unipod.rules.v1')).toBe(storedRules);
  });
});
