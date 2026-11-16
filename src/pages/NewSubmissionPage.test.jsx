import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewSubmissionPage } from './NewSubmissionPage';
import { backendApi } from '@/services/backend-api';

function renderPage({ isSubmitter = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/submissions/new']}>
      <Routes>
        <Route path="/submissions/new" element={<NewSubmissionPage token="test-token" onUnauthorized={vi.fn()} isSubmitter={isSubmitter} />} />
        <Route path="/submissions/new/confirmation" element={<div>confirmation screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewSubmissionPage wizard', () => {
  it('blocks advancing past Details until the required fields are filled', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/step 01 of 05/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/step 02 of 05/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/fill in every required field/i)).toBeInTheDocument();
    expect(screen.getByText(/step 02 of 05/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/step 03 of 05/i)).toBeInTheDocument();
    for (const field of screen.getAllByPlaceholderText(/file name or storage reference/i)) {
      await user.type(field, 'reference.pdf');
    }
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(await screen.findByText(/step 04 of 05/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/must accept the rules/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(await screen.findByText(/step 05 of 05/i)).toBeInTheDocument();
  }, 15000);

  it('submits a submitter-owned brief and sends it to intake', async () => {
    const user = userEvent.setup();
    const created = { id: 'brief-1', title: 'Community solar dryer' };
    const createSubmission = vi.spyOn(backendApi, 'createSubmission').mockResolvedValue(created);
    const addDocument = vi.spyOn(backendApi, 'addDocument').mockResolvedValue({});
    const submitSubmission = vi.spyOn(backendApi, 'submitSubmission').mockResolvedValue(created);
    renderPage({ isSubmitter: true });

    expect(screen.queryByLabelText(/submitter id/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /general innovation/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Community solar dryer');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Dry crops with solar energy.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Farmers lack affordable dryers.');
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.type(screen.getAllByPlaceholderText(/file name or storage reference/i)[0], 'brief.pdf');
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^submit brief$/i }));

    expect(await screen.findByText('confirmation screen')).toBeInTheDocument();
    expect(createSubmission).toHaveBeenCalledWith('test-token', expect.objectContaining({ title: 'Community solar dryer' }));
    expect(createSubmission.mock.calls[0][1]).not.toHaveProperty('submitterId');
    expect(addDocument).toHaveBeenCalledWith('test-token', 'brief-1', expect.objectContaining({ fileReference: 'brief.pdf' }));
    expect(submitSubmission).toHaveBeenCalledWith('test-token', 'brief-1');
  }, 15000);

  it('does not let submitters mark a recommendation letter as verified', async () => {
    const user = userEvent.setup();
    renderPage({ isSubmitter: true });
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByRole('option', { name: 'Submitted' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Verified' })).not.toBeInTheDocument();
  });
});
