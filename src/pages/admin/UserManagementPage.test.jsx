import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { server } from '@/mocks/server';
import { UserManagementPage } from './UserManagementPage';

const initialUsers = [
  { id: 'staff-admin', fullName: 'Demo Administrator', email: 'admin@unipod.test', role: 'ADMINISTRATOR', departmentId: '', active: true, version: 1 },
  { id: 'staff-1', fullName: 'Martha Akello', email: 'martha.akello@unipod.test', role: 'RECEPTIONIST', departmentId: 'dept-1', active: true, version: 1 },
  { id: 'staff-2', fullName: 'Grace Namuli', email: 'grace.namuli@unipod.test', role: 'REVIEWER', departmentId: 'dept-inactive', active: true, version: 1 },
];

let lastCreateBody;
let lastUpdateBody;
let lastStatusBody;
let adminRolesRequested;

function useAdminHandlers(initial = initialUsers) {
  let users = [...initial];
  lastCreateBody = null;
  lastUpdateBody = null;
  lastStatusBody = null;
  adminRolesRequested = false;
  server.use(
    http.get(`${API_BASE_URL}/admin/users`, ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? 0);
      const size = Number(url.searchParams.get('size') ?? 100);
      const items = users.slice(page * size, (page + 1) * size);
      return HttpResponse.json({
        items,
        page,
        size,
        totalElements: users.length,
        totalPages: Math.ceil(users.length / size),
      });
    }),
    http.post(`${API_BASE_URL}/admin/users`, async ({ request }) => {
      lastCreateBody = await request.json();
      const created = { ...lastCreateBody, id: 'staff-created', active: true, version: 1 };
      users = [created, ...users];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch(`${API_BASE_URL}/admin/users/:id/status`, async ({ params, request }) => {
      lastStatusBody = await request.json();
      const current = users.find((item) => item.id === params.id);
      const updated = { ...current, ...lastStatusBody, version: current.version + 1 };
      users = users.map((item) => item.id === params.id ? updated : item);
      return HttpResponse.json(updated);
    }),
    http.patch(`${API_BASE_URL}/admin/users/:id`, async ({ params, request }) => {
      lastUpdateBody = await request.json();
      const current = users.find((item) => item.id === params.id);
      const updated = { ...current, ...lastUpdateBody, version: current.version + 1 };
      users = users.map((item) => item.id === params.id ? updated : item);
      return HttpResponse.json(updated);
    }),
    http.get(`${API_BASE_URL}/admin/departments`, () => HttpResponse.json([
      { id: 'dept-1', name: 'Research', active: true, version: 1 },
      { id: 'dept-2', name: 'Finance', active: true, version: 1 },
      { id: 'dept-inactive', name: 'Legacy Department', active: false, version: 2 },
    ])),
    http.get(`${API_BASE_URL}/admin/roles`, () => {
      adminRolesRequested = true;
      return HttpResponse.json([
      { role: 'REVIEWER', staff: true },
      { role: 'RECEPTIONIST', staff: true },
      { role: 'FINANCE_OFFICER', staff: true },
      { role: 'DEPARTMENT_HEAD', staff: true },
      ]);
    }),
  );
}

function renderPage() {
  return render(<UserManagementPage token="mock-token" onUnauthorized={vi.fn()} />);
}

beforeEach(() => {
  useAdminHandlers();
});

describe('UserManagementPage', () => {
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
    expect(lastUpdateBody).toEqual({ role: 'DEPARTMENT_HEAD', departmentId: 'dept-2', version: 1 });
    expect(adminRolesRequested).toBe(true);
  });

  it('deactivates an account and preserves it in the directory', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('row', { name: /martha\.akello@unipod\.test/i });
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByRole('status')).toHaveTextContent('martha.akello@unipod.test is now deactivated.');
    expect(within(row).getByText('Deactivated')).toBeInTheDocument();
    expect(lastStatusBody).toEqual({ active: false, version: 1 });
    expect(lastStatusBody).not.toHaveProperty('departmentId');
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
    const createdRow = await screen.findByRole('row', { name: /amina\.okello@unipod\.test/i });
    expect(within(createdRow).getByLabelText('Role for amina.okello@unipod.test')).toHaveValue('FINANCE_OFFICER');
    expect(within(createdRow).getByLabelText('Department for amina.okello@unipod.test')).toHaveValue('dept-2');
    expect(lastCreateBody).toMatchObject({ role: 'FINANCE_OFFICER', departmentId: 'dept-2' });
    expect(lastCreateBody).not.toHaveProperty('departmentIds');
  });

  it('loads users beyond the first page', async () => {
    const manyUsers = Array.from({ length: 101 }, (_, index) => ({
      id: `staff-${index}`,
      fullName: `Staff Member ${index}`,
      email: `staff-${index}@unipod.test`,
      role: 'REVIEWER',
      departmentId: '',
      active: true,
      version: 1,
    }));
    useAdminHandlers(manyUsers);
    renderPage();

    expect(await screen.findByRole('row', { name: /staff-100@unipod\.test/i })).toBeInTheDocument();
  });

  it('keeps an assigned inactive department visible for an existing user', async () => {
    renderPage();

    const row = await screen.findByRole('row', { name: /grace\.namuli@unipod\.test/i });
    const departmentSelect = within(row).getByLabelText('Department for grace.namuli@unipod.test');
    expect(within(departmentSelect).getByRole('option', { name: 'Legacy Department (inactive)' })).toBeInTheDocument();
    expect(departmentSelect).toHaveValue('dept-inactive');
  });
});
