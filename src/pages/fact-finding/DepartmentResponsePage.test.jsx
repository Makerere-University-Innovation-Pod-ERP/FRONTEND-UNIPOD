import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DepartmentResponsePage } from './DepartmentResponsePage';
import { submissions } from '@/mocks/fixtures/submissions';

function renderPage(id) {
  return render(
    <MemoryRouter initialEntries={[`/fact-finding/department/${id}`]}>
      <Routes>
        <Route path="/fact-finding/department/:id" element={<DepartmentResponsePage token="test-token" onUnauthorized={vi.fn()} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DepartmentResponsePage', () => {
  const forwardedCases = submissions.filter((item) => item.stage === 'FORWARDED');

  it('blocks decline/send-back without a reason, then succeeds once one is entered', async () => {
    const user = userEvent.setup();
    const [forwarded] = forwardedCases;
    renderPage(forwarded.id);

    await screen.findByRole('heading', { name: forwarded.title });
    await user.click(screen.getByRole('button', { name: /decline \/ send back/i }));
    expect(await screen.findByText(/reason is required/i)).toBeInTheDocument();
    expect(screen.queryByText(/response sent/i)).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'Needs sign-off from the department head first.');
    await user.click(screen.getByRole('button', { name: /decline \/ send back/i }));

    expect(await screen.findByText(/response sent/i)).toBeInTheDocument();
  });

  it('accepts a forwarded case without requiring a reason', async () => {
    const user = userEvent.setup();
    const forwarded = forwardedCases[1];
    renderPage(forwarded.id);

    await screen.findByRole('heading', { name: forwarded.title });
    await user.click(screen.getByRole('button', { name: /^accept$/i }));

    expect(await screen.findByText(/response sent/i)).toBeInTheDocument();
  });
});
