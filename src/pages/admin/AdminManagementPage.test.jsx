import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { server } from '@/mocks/server';
import { AdminManagementPage } from './AdminManagementPage';

let departments;
let sectors;
let lastDepartmentBody;

function useAdminHandlers() {
  departments = [
    { id: 'dept-1', name: 'Research', notificationEmail: 'research@unipod.test', active: true, version: 1 },
  ];
  sectors = [
    { id: 'sec-active', name: 'Active Sector', notificationEmail: 'active@unipod.test', active: true, version: 1 },
    { id: 'sec-inactive', name: 'Dormant Sector', notificationEmail: 'dormant@unipod.test', active: false, version: 1 },
  ];
  lastDepartmentBody = null;
  server.use(
    http.get(`${API_BASE_URL}/admin/departments`, () => HttpResponse.json(departments)),
    http.post(`${API_BASE_URL}/admin/departments`, async ({ request }) => {
      lastDepartmentBody = await request.json();
      const created = { ...lastDepartmentBody, id: 'dept-created', active: true, version: 1 };
      departments = [...departments, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put(`${API_BASE_URL}/admin/departments/:id`, async ({ params, request }) => {
      lastDepartmentBody = await request.json();
      const updated = { ...departments.find((item) => item.id === params.id), ...lastDepartmentBody, version: 2 };
      departments = departments.map((item) => item.id === params.id ? updated : item);
      return HttpResponse.json(updated);
    }),
    http.get(`${API_BASE_URL}/sectors/catalog`, () => HttpResponse.json(sectors)),
    http.post(`${API_BASE_URL}/sectors`, async ({ request }) => {
      const body = await request.json();
      const created = { ...body, id: 'sec-created', version: 1 };
      sectors = [...sectors, created];
      return HttpResponse.json(created, { status: 201 });
    }),
  );
}

function renderPage() {
  return render(<AdminManagementPage token="mock-token" onUnauthorized={vi.fn()} />);
}

beforeEach(() => {
  useAdminHandlers();
});

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
    expect(lastDepartmentBody).toMatchObject({
      name: 'Community Health',
      notificationEmail: 'community@unipod.test',
      active: true,
    });
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

  it('shows active sectors as assignment areas without adding them to departments', async () => {
    const user = userEvent.setup();
    renderPage();

    const assignmentPanel = (await screen.findByRole('heading', { name: 'Staff assignment areas' })).closest('section');
    expect(await within(assignmentPanel).findByText('Active Sector')).toBeInTheDocument();
    expect(within(assignmentPanel).queryByText('Dormant Sector')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Sector name'), 'New Textile Sector');
    await user.type(screen.getByLabelText('Notification email'), 'textile@unipod.test');
    await user.click(screen.getByRole('button', { name: 'Create sector' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Sector created.');
    expect(await within(assignmentPanel).findByText('New Textile Sector')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Existing department')).queryByRole('option', { name: 'New Textile Sector' }))
      .not.toBeInTheDocument();
  });
});
