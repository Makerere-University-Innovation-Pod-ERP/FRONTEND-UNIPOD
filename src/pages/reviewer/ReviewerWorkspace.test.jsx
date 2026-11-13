import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerWorkspace } from './ReviewerWorkspace';
import { reviewerAssigned } from '@/mocks/fixtures/reviewer';

function renderWorkspace() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReviewerWorkspace token="test-token" onUnauthorized={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReviewerWorkspace', () => {
  it('shows only cases assigned to the reviewer', async () => {
    renderWorkspace();
    for (const item of reviewerAssigned) {
      expect(await screen.findByText(item.title)).toBeInTheDocument();
    }
    expect(screen.queryByText('Digital Heritage Preservation Project')).not.toBeInTheDocument();
  });

  it('shows the assign-reviewer control as visibly disabled with a reason', async () => {
    renderWorkspace();
    const assignButton = await screen.findByRole('button', { name: /assign reviewer/i });
    expect(assignButton).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByText(/reviewers cannot assign reviewers/i)).toBeInTheDocument();
    });
  });
});
