import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { backendApi } from '@/services/backend-api';
import { AuditLogPage } from './AuditLogPage';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage(entries) {
  vi.spyOn(backendApi, 'auditLogs').mockResolvedValue({
    items: entries ?? [
      {
        id: 'audit-1',
        occurredAt: '2026-11-23T15:42:18.000Z',
        actor: 'admin@unipod.test',
        action: 'USER_UPDATED',
        summary: 'Updated Martha Akello’s role',
        resourceType: 'USER',
        resourceId: 'staff-1',
        outcome: 'SUCCESS',
        ipAddress: '10.20.4.18',
      },
    ],
    page: 0,
    size: 25,
    totalElements: entries?.length ?? 1,
    totalPages: 1,
  });
  return render(<AuditLogPage token="mock-token" onUnauthorized={vi.fn()} />);
}

describe('AuditLogPage', () => {
  it('renders audit entries with actor, action, resource, and outcome', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Audit Log' })).toBeInTheDocument();
    expect(screen.getByText('admin@unipod.test')).toBeInTheDocument();
    expect(screen.getAllByText('USER UPDATED').length).toBeGreaterThan(0);
    expect(screen.getByText('Updated Martha Akello’s role')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('filters entries by outcome and shows an empty state', async () => {
    const user = userEvent.setup();
    renderPage([]);

    await screen.findByText('No audit entries found');
    await user.selectOptions(screen.getByLabelText('Outcome'), 'FAILURE');

    expect(backendApi.auditLogs).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('searches audit logs and restores all filters', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Updated Martha Akello’s role');
    await user.type(screen.getByLabelText('Search audit logs'), 'Martha');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByLabelText('Search audit logs')).toHaveValue('');
  });
});
