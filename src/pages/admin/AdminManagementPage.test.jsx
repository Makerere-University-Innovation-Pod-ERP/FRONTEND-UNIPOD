import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminManagementPage } from './AdminManagementPage';

function renderPage() {
  return render(<AdminManagementPage token="mock-token" onUnauthorized={vi.fn()} />);
}

describe('AdminManagementPage', () => {
  it('updates staff role and department assignments', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /martha\.akello@unipod\.test/i });
    await user.selectOptions(within(row).getByLabelText('Role for martha.akello@unipod.test'), 'DEPARTMENT_HEAD');
    await user.selectOptions(within(row).getByLabelText('Department for martha.akello@unipod.test'), 'dept-2');
    await user.click(within(row).getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Access settings updated for martha.akello@unipod.test.');
    expect(within(row).getByLabelText('Role for martha.akello@unipod.test')).toHaveValue('DEPARTMENT_HEAD');
    expect(within(row).getByLabelText('Department for martha.akello@unipod.test')).toHaveValue('dept-2');
  });

  it('deactivates an account without removing it from the directory', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /martha\.akello@unipod\.test/i });
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByRole('status')).toHaveTextContent('martha.akello@unipod.test is now deactivated.');
    expect(within(row).getByText('Deactivated')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
  });

  it('protects administrator assignments and account status from UI changes', async () => {
    renderPage();

    const row = await screen.findByRole('row', { name: /admin@unipod\.test/i });
    expect(within(row).getByLabelText('Role for admin@unipod.test')).toBeDisabled();
    expect(within(row).getByLabelText('Department for admin@unipod.test')).toBeDisabled();
    expect(within(row).getByRole('button', { name: 'Deactivate' })).toBeDisabled();
  });

  it('creates a department and allows its lifecycle to be managed', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Manage departments' });
    await user.type(screen.getByLabelText('Department name'), 'Community Health');
    await user.click(screen.getByRole('button', { name: 'Create department' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Department created.');
    expect(screen.getAllByRole('option', { name: 'Community Health' }).length).toBeGreaterThan(0);
  });

  it('saves permission changes for configurable roles', async () => {
    const user = userEvent.setup();
    renderPage();

    const reviewerHeading = await screen.findByRole('heading', { name: 'Reviewer' });
    const roleCard = reviewerHeading.closest('.management-role');
    await user.click(within(roleCard).getByLabelText('Manage finance'));
    await user.click(within(roleCard).getByRole('button', { name: 'Save permissions' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Reviewer permissions saved.');
    expect(within(roleCard).getByLabelText('Manage finance')).toBeChecked();
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
    expect(await screen.findByRole('row', { name: /amina\.okello@unipod\.test/i })).toBeInTheDocument();
  });
});
