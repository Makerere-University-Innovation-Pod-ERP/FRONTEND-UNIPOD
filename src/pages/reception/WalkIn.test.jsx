import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeMockToken } from '@/mocks/jwt';
import { WalkInSubmissionPage } from './WalkInSubmissionPage';
import { WalkInSubmittedPage } from './WalkInSubmittedPage';

const token = makeMockToken(['ROLE_RECEPTIONIST'], 'Reception Desk');

function renderWalkIn() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reception/walk-in']}>
        <Routes>
          <Route path="/reception/walk-in" element={<WalkInSubmissionPage token={token} onUnauthorized={vi.fn()} />} />
          <Route path="/reception/walk-in/confirmation" element={<WalkInSubmittedPage staffName="Reception Desk" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function identifyPerson(user, { type, name, email }) {
  await user.click(screen.getByLabelText(type));
  await user.type(screen.getByLabelText('Full name'), name);
  await user.type(screen.getByLabelText('Email address'), email);
  await user.click(screen.getByRole('button', { name: /continue to the brief form/i }));
}

describe('Walk-in submission', () => {
  it('asks for the name and a valid email before continuing', async () => {
    const user = userEvent.setup();
    renderWalkIn();
    await user.click(screen.getByRole('button', { name: /continue to the brief form/i }));
    expect(await screen.findByText("Enter the person's full name.")).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('creates a minimal account for a new person and opens the form on their behalf', async () => {
    const user = userEvent.setup();
    renderWalkIn();
    await identifyPerson(user, { type: 'Member of the public', name: 'Joan Akello', email: 'joan.akello@example.com' });

    expect(await screen.findByText('Minimal account created')).toBeInTheDocument();
    const banner = screen.getByRole('status', { name: 'Submitting on behalf of' });
    expect(within(banner).getByText('Joan Akello')).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it('finds an existing account instead of creating a new one', async () => {
    const user = userEvent.setup();
    renderWalkIn();
    await identifyPerson(user, { type: 'Member of the public', name: 'Grace Namuli', email: 'grace.namuli@example.com' });
    expect(await screen.findByText('Existing account found')).toBeInTheDocument();
  });

  it('records the walk-in as owner and the receptionist as assisting', async () => {
    const user = userEvent.setup();
    renderWalkIn();
    await identifyPerson(user, { type: 'Member of the public', name: 'Peter Ouma', email: 'peter.ouma@example.com' });
    await screen.findByText('Minimal account created');

    // Step 1: type
    await user.click(screen.getByLabelText(/general innovation/i));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    // Step 2: details - Submitter ID is filled in and locked
    const submitterId = screen.getByLabelText(/submitter id/i);
    expect(submitterId).toHaveAttribute('readonly');
    expect(submitterId.value).not.toBe('');
    await user.type(screen.getByPlaceholderText(/give the project a clear/i), 'Bicycle Water Pump');
    await user.type(screen.getByPlaceholderText(/what does this project aim/i), 'Pump water without fuel.');
    await user.type(screen.getByPlaceholderText(/what problem or need/i), 'Fuel pumps are too expensive.');
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    // Step 3: documents
    await user.type(screen.getAllByPlaceholderText(/file name or storage reference/i)[0], 'brief.pdf');
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    // Step 4: rules
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    // Step 5: submit
    await user.click(screen.getByRole('button', { name: /create draft/i }));

    expect(await screen.findByText('WALK-IN BRIEF SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText('Peter Ouma (peter.ouma@example.com)')).toBeInTheDocument();
    expect(screen.getByText('Reception Desk')).toBeInTheDocument();
  });
});
