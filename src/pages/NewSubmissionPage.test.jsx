import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewSubmissionPage } from './NewSubmissionPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/submissions/new']}>
      <Routes>
        <Route path="/submissions/new" element={<NewSubmissionPage token="test-token" onUnauthorized={vi.fn()} />} />
        <Route path="/submissions/new/confirmation" element={<div>confirmation screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewSubmissionPage wizard', () => {
  it('blocks advancing past Details until the required fields are filled', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/step 2 of 5/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/fill in every required field/i)).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
  });

  it('blocks the final submit until the department rules are accepted', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Solar Dryer for Smallholder Farmers');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Reduce post-harvest crop loss.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Farmers lack affordable drying equipment.');
    await user.type(screen.getByLabelText(/student number/i), 'S24/9999');
    await user.type(screen.getByLabelText(/^programme/i), 'BSc Engineering');
    await user.type(screen.getByLabelText(/supervisor/i), 'Dr. Example');
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(await screen.findByText(/step 3 of 5/i)).toBeInTheDocument();
    for (const field of screen.getAllByPlaceholderText(/file name or storage reference/i)) {
      await user.type(field, 'reference.pdf');
    }
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(await screen.findByText(/step 4 of 5/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/must accept the rules/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/step 5 of 5/i)).toBeInTheDocument();
  });
});
