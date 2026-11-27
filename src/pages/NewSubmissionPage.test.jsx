import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewSubmissionPage } from './NewSubmissionPage';
import { BriefSubmittedPage } from './BriefSubmittedPage';
import { backendApi } from '@/services/backend-api';

function renderPage({ isSubmitter = false, initialEntry = '/submissions/new' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/submissions/new" element={<NewSubmissionPage token="test-token" onUnauthorized={vi.fn()} isSubmitter={isSubmitter} />} />
          <Route path="/submissions/new/confirmation" element={<BriefSubmittedPage isSubmitter={isSubmitter} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function acceptAllRules(user) {
  for (const checkbox of await screen.findAllByRole('checkbox')) {
    // eslint-disable-next-line no-await-in-loop
    await user.click(checkbox);
  }
}

describe('NewSubmissionPage wizard', () => {
  it('blocks advancing past Details until the required fields are filled', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/step 01 of 05/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    expect(await screen.findByText(/step 02 of 05/i)).toBeInTheDocument();
    expect(screen.getByText('Submission type').closest('li').querySelector('svg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    expect(await screen.findByText(/fill in every required field/i)).toBeInTheDocument();
    expect(screen.getByText(/step 02 of 05/i)).toBeInTheDocument();
  });

  it('blocks the final submit until the department rules are accepted', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Solar Dryer for Smallholder Farmers');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Reduce post-harvest crop loss.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Farmers lack affordable drying equipment.');
    await user.type(screen.getByLabelText(/student number/i), 'S24/9999');
    await user.type(screen.getByLabelText(/^programme/i), 'BSc Engineering');
    await user.type(screen.getByLabelText(/supervisor/i), 'Dr. Example');
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));

    expect(await screen.findByText(/step 03 of 05/i)).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText('Upload Project brief or description document'),
      new File(['Brief contents'], 'brief.pdf', { type: 'application/pdf' }),
    );
    await user.upload(
      screen.getByLabelText('Upload Recommendation letter'),
      new File(['Recommendation'], 'recommendation.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));

    expect(await screen.findByText(/step 04 of 05/i)).toBeInTheDocument();
    expect(await screen.findByText(/originality and attribution/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    expect(await screen.findByText(/must accept the rules/i)).toBeInTheDocument();

    await acceptAllRules(user);
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    expect(await screen.findByText(/step 05 of 05/i)).toBeInTheDocument();
  }, 15000);

  it('does not create a brief from an implicit form submission', async () => {
    const user = userEvent.setup();
    const createSubmission = vi.spyOn(backendApi, 'createSubmission').mockResolvedValue({
      id: 'brief-implicit',
      title: 'Community solar dryer',
    });
    const { container } = renderPage({ isSubmitter: true });

    await user.click(screen.getByRole('radio', { name: /general innovation/i }));
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Community solar dryer');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Dry crops with solar energy.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Farmers lack affordable dryers.');
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await user.upload(
      screen.getByLabelText('Upload Project brief or description document'),
      new File(['Brief contents'], 'brief.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await acceptAllRules(user);
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));

    fireEvent.submit(container.querySelector('form'));

    expect(createSubmission).not.toHaveBeenCalled();
    expect(screen.getByText(/step 05 of 05/i)).toBeInTheDocument();
  }, 15000);

  it('submits a submitter-owned brief and sends it to intake', async () => {
    const user = userEvent.setup();
    const created = { id: 'brief-1', title: 'Community solar dryer' };
    const createSubmission = vi.spyOn(backendApi, 'createSubmission').mockResolvedValue(created);
    let activeUploads = 0;
    let maxActiveUploads = 0;
    const uploadDocument = vi.spyOn(backendApi, 'uploadDocument').mockImplementation(async () => {
      activeUploads += 1;
      maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeUploads -= 1;
      return {};
    });
    const submitSubmission = vi.spyOn(backendApi, 'submitSubmission').mockResolvedValue(created);
    renderPage({ isSubmitter: true });

    expect(screen.queryByLabelText(/submitter id/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /general innovation/i }));
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Community solar dryer');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Dry crops with solar energy.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Farmers lack affordable dryers.');
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    const briefFile = new File(['A brief about the project'], 'brief.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Upload Project brief or description document'), briefFile);
    const evidenceFile = new File(['A chart'], 'evidence.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Upload Supporting evidence (data, photos, reports)'), evidenceFile);
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await acceptAllRules(user);
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await user.click(screen.getByRole('button', { name: /^submit brief$/i }));

    expect(await screen.findByRole('heading', { name: /thanks — your brief is in/i })).toBeInTheDocument();
    expect(createSubmission).toHaveBeenCalledWith('test-token', expect.objectContaining({ title: 'Community solar dryer' }));
    expect(createSubmission.mock.calls[0][1]).not.toHaveProperty('submitterId');
    expect(createSubmission.mock.calls[0][1].acceptedRulesVersion).toBe('general-v1');
    expect(uploadDocument).toHaveBeenCalledTimes(2);
    expect(maxActiveUploads).toBe(1);
    expect(uploadDocument).toHaveBeenNthCalledWith(1, 'test-token', 'brief-1', expect.any(FormData));
    const uploadedData = uploadDocument.mock.calls[0][2];
    expect(uploadedData.get('name')).toBe('Project brief or description document');
    expect(uploadedData.get('status')).toBe('SUBMITTED');
    expect(uploadedData.get('documentType')).toBe('PROJECT_BRIEF');
    expect(uploadedData.get('file')).toBe(briefFile);
    const evidenceData = uploadDocument.mock.calls[1][2];
    expect(evidenceData.get('documentType')).toBe('SUPPORTING_EVIDENCE');
    expect(evidenceData.get('file')).toBe(evidenceFile);
    expect(submitSubmission).toHaveBeenCalledWith('test-token', 'brief-1');
  }, 15000);

  it('creates and submits a service request with the backend intake fields', async () => {
    const user = userEvent.setup();
    const preferredDate = new Date();
    preferredDate.setDate(preferredDate.getDate() + 1);
    const preferredAt = `${preferredDate.getFullYear()}-${String(preferredDate.getMonth() + 1).padStart(2, '0')}-${String(preferredDate.getDate()).padStart(2, '0')}T10:30`;
    const created = {
      id: 'service-request-1',
      title: 'Prototype a solar dryer',
      category: 'service_request',
    };
    const createSubmission = vi.spyOn(backendApi, 'createSubmission').mockResolvedValue(created);
    const submitSubmission = vi.spyOn(backendApi, 'submitSubmission').mockResolvedValue(created);
    renderPage({
      isSubmitter: true,
      initialEntry: '/submissions/new?category=service_request',
    });

    expect(screen.getByRole('heading', { name: 'Request a UniPod service.' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /service request/i })).toBeChecked();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.type(screen.getByLabelText(/request title/i), 'Prototype a solar dryer');
    await user.type(screen.getByLabelText(/what support do you need/i), 'Help us build a working prototype.');
    await user.type(screen.getByLabelText(/context or challenge/i), 'Local farmers need a low-cost way to dry crops.');
    await user.type(screen.getByLabelText(/service needed/i), 'Prototyping and fabrication');
    await user.click(screen.getByRole('combobox', { name: 'Who is requesting this service?' }));
    await user.click(await screen.findByRole('option', { name: 'Student' }));
    await user.type(screen.getByLabelText(/what result are you expecting/i), 'A tested prototype for field trials.');
    await user.click(screen.getByRole('button', { name: 'Preferred date' }));
    await user.click(screen.getByRole('button', {
      name: new RegExp(`${preferredDate.getDate()}.*${preferredDate.getFullYear()}`),
    }));
    fireEvent.change(screen.getByLabelText('Preferred time'), { target: { value: '10:30' } });
    await user.type(screen.getByLabelText(/phone number/i), '+256 700 123456');
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await acceptAllRules(user);
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^submit service request$/i }));

    expect(await screen.findByRole('heading', { name: /thanks — your request is in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track service requests/i })).toHaveAttribute(
      'href',
      '/my-submissions/service-requests',
    );
    expect(createSubmission).toHaveBeenCalledWith('test-token', expect.objectContaining({
      category: 'service_request',
      title: 'Prototype a solar dryer',
      serviceRequested: 'Prototyping and fabrication',
      serviceRequester: 'student',
      purpose: 'Help us build a working prototype.',
      problemAddressed: 'Local farmers need a low-cost way to dry crops.',
      expectedResult: 'A tested prototype for field trials.',
      preferredAt: new Date(preferredAt).toISOString(),
      submitterPhone: '+256 700 123456',
      acceptedRulesVersion: 'general-v1',
    }));
    expect(submitSubmission).toHaveBeenCalledWith('test-token', 'service-request-1');
  }, 15000);

  it('requires service-request details before advancing', async () => {
    const user = userEvent.setup();
    renderPage({
      isSubmitter: true,
      initialEntry: '/submissions/new?category=service_request',
    });

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(await screen.findByText(/fill in every required field/i)).toBeInTheDocument();
    expect(screen.getByText(/step 02 of 05/i)).toBeInTheDocument();
  });

  it('previews and removes a selected document before continuing', async () => {
    const user = userEvent.setup();
    const { container } = renderPage({ isSubmitter: true });
    await user.click(screen.getByRole('radio', { name: /general innovation/i }));
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Community solar dryer');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Dry crops with solar energy.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Farmers lack affordable dryers.');
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));

    const briefFile = new File(['image data'], 'idea.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload Project brief or description document'), briefFile);
    await user.click(screen.getByRole('button', { name: 'Preview idea.png' }));
    expect(screen.getByRole('dialog', { name: 'idea.png' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Preview of idea.png' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close preview' }));

    await user.click(screen.getByRole('button', { name: 'Remove idea.png' }));
    expect(container.querySelector('.submission-upload-card.has-file')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));
    expect(screen.getByText(/upload this required document to continue/i)).toBeInTheDocument();
  });

  it('does not let submitters mark a recommendation letter as verified', async () => {
    const user = userEvent.setup();
    const { container } = renderPage({ isSubmitter: true });
    await user.click(screen.getByRole('button', { name: /^(next|continue)$/i }));

    expect(screen.getByText(/fields marked \*/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.submission-required-mark')).toHaveLength(6);
    expect(screen.queryByLabelText(/^supervisor/i)).not.toBeInTheDocument();
    const statusSelect = screen.getByRole('combobox', { name: /Recommendation letter status/ });
    expect(statusSelect).toHaveTextContent('Submitted');
    expect(statusSelect).toHaveClass('submission-form-select-trigger');
    const fallbackSelect = container.querySelector('select[aria-hidden="true"]');
    expect([...fallbackSelect.options].map((option) => option.textContent)).toEqual([
      'Submitted',
      'One file',
      'Not required',
    ]);
  });
});
