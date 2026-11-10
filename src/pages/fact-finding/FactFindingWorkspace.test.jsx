import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FactFindingWorkspace } from './FactFindingWorkspace';
import { factFindingCases, factFindingQueue } from '@/mocks/fixtures/fact-finding';

function renderWorkspace() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FactFindingWorkspace token="test-token" onUnauthorized={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FactFindingWorkspace', () => {
  it('renders the checklist and next-action recommendation for the first queued case', async () => {
    renderWorkspace();
    const firstCase = factFindingCases[factFindingQueue[0].id];
    expect(await screen.findByRole('heading', { name: firstCase.title })).toBeInTheDocument();
    for (const item of firstCase.checklist) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
    expect(screen.getByText(new RegExp(firstCase.nextAction.recommendation))).toBeInTheDocument();
  });

  it('saves an assessment and shows confirmation', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const firstCase = factFindingCases[factFindingQueue[0].id];
    await screen.findByRole('heading', { name: firstCase.title });

    await user.selectOptions(screen.getByRole('combobox'), firstCase.nextAction.options[0]);
    await user.click(screen.getByRole('button', { name: /save assessment/i }));

    expect(await screen.findByText(/assessment saved/i)).toBeInTheDocument();
  });
});
