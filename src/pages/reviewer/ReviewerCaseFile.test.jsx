import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerCaseFile } from './ReviewerCaseFile';
import { reviewerCases } from '@/mocks/fixtures/reviewer';

function renderCaseFile(id) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/reviewer/cases/${id}`]}>
        <Routes>
          <Route path="/reviewer/cases/:id" element={<ReviewerCaseFile token="test-token" onUnauthorized={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReviewerCaseFile', () => {
  it('shows exactly three decision options and blocks submit without a comment', async () => {
    const user = userEvent.setup();
    const pendingCase = reviewerCases['IH-26031'];
    renderCaseFile(pendingCase.id);

    await screen.findByRole('heading', { name: pendingCase.title });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios.map((radio) => radio.value).sort()).toEqual(['changes_needed', 'not_recommended', 'recommended']);

    await user.click(radios.find((radio) => radio.value === 'recommended'));
    await user.click(screen.getByRole('button', { name: /submit decision/i }));

    expect(await screen.findByText(/comment is required/i)).toBeInTheDocument();
  });

  it('submits a decision and then shows it as read-only', async () => {
    const user = userEvent.setup();
    const pendingCase = reviewerCases['IH-26024'];
    renderCaseFile(pendingCase.id);

    await screen.findByRole('heading', { name: pendingCase.title });
    const changesNeededRadio = screen.getAllByRole('radio').find((radio) => radio.value === 'changes_needed');
    await user.click(changesNeededRadio);
    await user.type(screen.getByPlaceholderText(/required for every decision/i), 'Needs a clearer budget breakdown.');
    await user.click(screen.getByRole('button', { name: /submit decision/i }));

    expect(await screen.findByText(/cannot be edited/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit decision/i })).not.toBeInTheDocument();
  });

  it('shows an already-decided case as read-only with no form', async () => {
    const decidedCase = reviewerCases['IH-26029'];
    renderCaseFile(decidedCase.id);

    await screen.findByRole('heading', { name: decidedCase.title });
    expect(screen.getByText(decidedCase.comment)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit decision/i })).not.toBeInTheDocument();
  });
});
