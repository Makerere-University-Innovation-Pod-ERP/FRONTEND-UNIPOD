import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeMockToken } from '@/mocks/jwt';
import { ReceptionHomePage } from './ReceptionHomePage';
import { BriefCheckPage } from './BriefCheckPage';
import { MissingDocumentsPage } from './MissingDocumentsPage';

const token = makeMockToken(['ROLE_RECEPTIONIST'], 'Reception Desk');

/** Shows one Reception screen at the given address, with fresh data loading. */
function renderAt(path) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reception/home" element={<ReceptionHomePage token={token} onUnauthorized={vi.fn()} />} />
          <Route path="/reception/briefs/:id" element={<BriefCheckPage token={token} onUnauthorized={vi.fn()} />} />
          <Route path="/reception/missing-documents" element={<MissingDocumentsPage token={token} onUnauthorized={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Reception home', () => {
  it('shows the work-queue counters and filters the list by search', async () => {
    const user = userEvent.setup();
    renderAt('/reception/home');
    const counters = await screen.findByRole('region', { name: 'Reception work queue' });
    expect(within(counters).getByText('Waiting')).toBeInTheDocument();
    expect(within(counters).getByText('Missing documents')).toBeInTheDocument();
    expect(within(counters).getByText('Updated recently')).toBeInTheDocument();
    expect(await screen.findByText('Solar Dryer for Fruit Vendors')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search new briefs' }), 'podcast');
    expect(await screen.findByText('Podcast Series on Local Startups')).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText('Solar Dryer for Fruit Vendors')).not.toBeInTheDocument());
  });
});

describe('Brief check and forward', () => {
  it('keeps Forward locked until every check list item is ticked, then records it in history', async () => {
    const user = userEvent.setup();
    renderAt('/reception/briefs/IH-26101');
    const forwardButton = await screen.findByRole('button', { name: 'Forward' });
    expect(forwardButton).toBeDisabled();

    const checkboxes = within(screen.getByRole('group', { name: 'Check list' })).getAllByRole('checkbox');
    for (const box of checkboxes.slice(0, -1)) await user.click(box);
    expect(forwardButton).toBeDisabled();
    await user.click(checkboxes[checkboxes.length - 1]);
    expect(forwardButton).toBeEnabled();

    await user.click(forwardButton);
    expect(await screen.findByText(/forwarded to Innovation/)).toBeInTheDocument();
    expect(screen.getByText('Forwarded → Innovation')).toBeInTheDocument();
  });

  it('shows the submitter content as read only (no text boxes for it)', async () => {
    renderAt('/reception/briefs/IH-26103');
    expect(await screen.findByText('Record stories of young founders to inspire others.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Record stories of young founders to inspire others.')).not.toBeInTheDocument();
  });

  it('needs a due date before asking for missing information', async () => {
    const user = userEvent.setup();
    renderAt('/reception/briefs/IH-26102');
    await user.click(await screen.findByRole('button', { name: 'Ask the submitter' }));
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Choose a due date.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Due date'), '2099-12-31');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Missing information requested → Submitter')).toBeInTheDocument();
  });
});

describe('Missing documents list', () => {
  it('lists briefs waiting on the submitter', async () => {
    renderAt('/reception/missing-documents');
    expect(await screen.findByText('Low-cost Signal Booster')).toBeInTheDocument();
  });
});
