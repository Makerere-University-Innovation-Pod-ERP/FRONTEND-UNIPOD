import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagementPage } from './UserManagementPage';

function renderPage() {
  return render(<UserManagementPage token="mock-token" onUnauthorized={vi.fn()} />);
}

describe('UserManagementPage', () => {
  it('updates staff role and department assignments', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /martha\.akello@unipod\.test/i });
    await user.selectOptions(within(row).getByLabelText('Role for martha.akello@unipod.test'), 'DEPARTMENT_HEAD');
    await user.selectOptions(within(row).getByLabelText('Department for martha.akello@unipod.test'), 'dept-2');
    await user.click(within(row).getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Access settings updated for martha.akello@unipod.test.');
  });

  it('deactivates an account and preserves it in the directory', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /martha\.akello@unipod\.test/i });
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByRole('status')).toHaveTextContent('martha.akello@unipod.test is now deactivated.');
    expect(within(row).getByText('Deactivated')).toBeInTheDocument();
  });

  it('creates a staff account with its initial role and department', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Full name'), 'Amina Okello');
    await user.type(screen.getByLabelText('Email address'), 'amina.okello@unipod.test');
    await user.type(screen.getByLabelText(/Initial password/), 'AnInitialPassword123');
    await user.selectOptions(screen.getByLabelText('Role'), 'FINANCE_OFFICER');
    await user.selectOptions(screen.getByLabelText('Department'), 'dept-2');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/created amina\.okello@unipod\.test as finance officer/i)).toBeInTheDocument();
  });
});
