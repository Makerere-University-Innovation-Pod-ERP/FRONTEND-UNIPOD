import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RespondToRequestPage } from './RespondToRequestPage';
import { submissions } from '@/mocks/fixtures/submissions';

function renderPage(id) {
  return render(
    <MemoryRouter initialEntries={[`/submissions/${id}/respond`]}>
      <Routes>
        <Route path="/submissions/:id/respond" element={<RespondToRequestPage token="test-token" onUnauthorized={vi.fn()} />} />
        <Route path="/submissions/:id" element={<div>back on the case page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RespondToRequestPage', () => {
  it('shows the before/after comparison and bumps the version on submit', async () => {
    const user = userEvent.setup();
    const refinementCase = submissions.find((item) => item.stage === 'REFINEMENT_REQUESTED');
    const versionBefore = refinementCase.version;
    renderPage(refinementCase.id);

    const beforeHeading = await screen.findByText('BEFORE');
    const beforeSection = within(beforeHeading.closest('div'));
    expect(beforeSection.getByText(refinementCase.previousVersionSnapshot.purpose)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /submit response/i }));
    expect(await screen.findByText(/describe what you changed/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/summarize how you addressed/i), 'Clarified the follow-up detection method.');
    await user.click(screen.getByRole('button', { name: /submit response/i }));

    await screen.findByText('back on the case page');
    expect(refinementCase.stage).toBe('UNDER_REVIEW');
    expect(refinementCase.version).toBe(versionBefore + 1);
  });
});
