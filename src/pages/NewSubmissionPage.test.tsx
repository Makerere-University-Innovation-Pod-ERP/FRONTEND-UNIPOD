import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewSubmissionPage } from './NewSubmissionPage';
import { backendApi } from '@/services/backend-api';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(backendApi, 'sectors').mockResolvedValue([]);
});

function renderWizard() {
  return render(
    <MemoryRouter>
      <NewSubmissionPage token="test-token" roles={['ROLE_SUBMITTER']} onUnauthorized={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('NewSubmissionPage', () => {
  it('walks a general innovation through the five workflow steps', async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByRole('heading', { name: /submit a brief/i })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/General innovation/));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('heading', { name: 'Brief details' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Brief title'), 'Campus accessibility map');
    await user.type(screen.getByLabelText('Purpose'), 'Make inclusive navigation easier.');
    await user.type(screen.getByLabelText('Problem or need addressed'), 'Accessibility information is scattered.');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByText('Required · missing')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Document name'), 'Accessibility brief v1');
    await user.click(screen.getByRole('button', { name: /add document/i }));
    expect(screen.queryByText('Required · missing')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('heading', { name: 'Rules acceptance' })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/I have read and accept the UniPod general submission rules/i));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('heading', { name: 'Review & submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit brief/i })).toBeEnabled();
    expect(screen.getByText('Campus accessibility map')).toBeInTheDocument();
    expect(screen.getByText('Backend permission:')).toBeInTheDocument();
  }, 15000);

  it('blocks the documents step until the required brief is attached', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByLabelText(/Student project/));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(screen.getByLabelText('Brief title'), 'Smart irrigation');
    await user.type(screen.getByLabelText('Purpose'), 'Save water.');
    await user.type(screen.getByLabelText('Problem or need addressed'), 'Manual schedules waste water.');
    await user.type(screen.getByLabelText('Student number'), 'S24/1048');
    await user.type(screen.getByLabelText('Programme'), 'BSc Agricultural Engineering');
    await user.type(screen.getByLabelText('Supervisor'), 'Dr. Isaac Mugisha');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    expect(screen.getByText(/missing required documents/i)).toBeInTheDocument();
  });
});
