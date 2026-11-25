import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FactFindingWorkspace } from './FactFindingWorkspace';
import { submissions } from '@/mocks/fixtures/submissions';

// Each mutating test below picks its own distinct case: the underlying
// fixture is shared, mutable module state, and submitting a fact-finding
// action for one case must not affect another test's selection.
const queueItems = submissions.filter((item) => ['FORWARDED', 'FACT_FINDING'].includes(item.stage));

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

async function selectCase(user, item) {
  await user.click(await screen.findByRole('button', { name: new RegExp(item.title) }));
  await screen.findByRole('heading', { name: item.title });
}

describe('FactFindingWorkspace', () => {
  it('renders the case summary and documents for the selected case', async () => {
    const user = userEvent.setup();
    const target = queueItems[0];
    renderWorkspace();
    await selectCase(user, target);

    expect(screen.getByText(target.purpose)).toBeInTheDocument();
    expect(screen.getByText('Project brief')).toBeInTheDocument();
  });
});
