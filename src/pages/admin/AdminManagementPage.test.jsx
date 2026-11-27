import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminManagementPage } from './AdminManagementPage';

function renderPage() {
  return render(<AdminManagementPage token="mock-token" onUnauthorized={vi.fn()} />);
}

describe('AdminManagementPage', () => {
  it('creates a department and allows its lifecycle to be managed', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Manage departments' });
    await user.type(screen.getByLabelText('Department name'), 'Community Health');
    await user.type(screen.getByLabelText('Department notification email'), 'community@unipod.test');
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
});
