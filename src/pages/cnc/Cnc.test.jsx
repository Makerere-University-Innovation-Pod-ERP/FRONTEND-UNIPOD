import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api-client';
import { server } from '@/mocks/server';
import { NewJobPage } from './NewJobPage';
import { DesignCheckPage } from './DesignCheckPage';
import { JobBoardPage } from './JobBoardPage';
import { JobPage } from './JobPage';
import { MachineListPage } from './MachineListPage';
import { MachineBookingPage } from './MachineBookingPage';
import { SafetyCoursePage } from './SafetyCoursePage';

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

function renderAt(path, routes) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes.map(([routePath, Page]) => <Route key={routePath} path={routePath} element={<Page token="test-token" />} />)}
          <Route path="/cnc/jobs/:id" element={<JobPage token="test-token" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CNC job board', () => {
  it('places jobs in their backend stage columns', async () => {
    renderAt('/cnc/board', [['/cnc/board', JobBoardPage]]);
    const newColumn = await screen.findByTestId('column-NEW');
    expect(within(newColumn).getByText('Laser-cut display stand')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-PAYMENT_GATE')).getByText('Acrylic name plates')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-IN_PRODUCTION')).getByText('Workshop stool set')).toBeInTheDocument();
  });
});

describe('New job', () => {
  it('requires the rules to be accepted, then creates the job and opens it', async () => {
    const user = userEvent.setup();
    renderAt('/cnc/jobs/new', [['/cnc/jobs/new', NewJobPage]]);
    await user.type(screen.getByLabelText(/what is to be made/i), 'Bookshelf');
    await user.type(screen.getByLabelText(/customer name/i), 'Arthur Kanyike');
    await user.selectOptions(screen.getByLabelText(/^material/i), 'MDF');
    await user.type(screen.getByLabelText(/^size/i), '1800 × 900 mm');
    await user.click(screen.getByRole('button', { name: /send job/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/rules must be accepted/i);

    await user.click(screen.getByLabelText(/accept the unipod general rules/i));
    await user.click(screen.getByRole('button', { name: /send job/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Bookshelf' })).toBeInTheDocument();
  });
});

describe('Design check & quote', () => {
  it('locks the quote until every design check passes, then sends it', async () => {
    const user = userEvent.setup();
    renderAt('/cnc/review?job=cnc-1', [['/cnc/review', DesignCheckPage]]);
    const form = await screen.findByRole('form', { name: /design check for laser-cut display stand/i });
    await user.selectOptions(await within(form).findByLabelText(/price list item/i), 'price-laser');
    await user.click(within(form).getByRole('button', { name: /send quote/i }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(/every design check/i);

    for (const box of within(form).getAllByRole('checkbox')) await user.click(box);
    await user.click(within(form).getByRole('button', { name: /send quote/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Laser-cut display stand' })).toBeInTheDocument();
    expect(screen.getByText('Waiting for proof')).toBeInTheDocument();
  });
});

describe('Job page', () => {
  it('keeps scheduling locked until payment is confirmed', async () => {
    renderAt('/cnc/jobs/cnc-3', []);
    expect(await screen.findByText(/scheduling unlocks once finance confirms/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /schedule job/i })).toBeDisabled();
  });

  it('schedules a paid job', async () => {
    const user = userEvent.setup();
    renderAt('/cnc/jobs/cnc-2', []);
    await user.click(await screen.findByRole('button', { name: /schedule job/i }));
    expect(await screen.findByRole('button', { name: /start production/i })).toBeInTheDocument();
  });

  it('records materials, machine time and the quality check, then collection', async () => {
    const user = userEvent.setup();
    renderAt('/cnc/jobs/cnc-4', []);
    const form = await screen.findByRole('form', { name: /record production/i });
    await user.type(within(form).getByLabelText('Material'), 'Pine plank');
    await user.type(within(form).getByLabelText('Quantity'), '6');
    await user.type(within(form).getByLabelText(/machine time/i), 'CNC router 2 h');
    await user.click(within(form).getByRole('button', { name: /mark checked & ready/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/every quality check/i);

    for (const box of within(form).getAllByRole('checkbox')) await user.click(box);
    await user.click(within(form).getByRole('button', { name: /mark checked & ready/i }));

    const collect = await screen.findByRole('form', { name: /record collection/i });
    await user.type(within(collect).getByLabelText(/collected by/i), 'Daniel Kato');
    await user.click(within(collect).getByRole('button', { name: /record collection/i }));
    expect(await screen.findByText(/this job is complete/i)).toBeInTheDocument();
    expect(screen.getByText(/pine plank × 6 pcs/i)).toBeInTheDocument();
  });
});

describe('Machines', () => {
  it('reports a fault and marks the machine working again', async () => {
    const user = userEvent.setup();
    renderAt('/cnc/machines', [['/cnc/machines', MachineListPage]]);
    const row = await screen.findByTestId('machine-row-fac-laser');
    await user.click(within(row).getByRole('button', { name: /report fault/i }));
    await user.click(within(row).getByRole('button', { name: /confirm fault/i }));
    expect(await within(row).findByText('Fault reported')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: /mark working/i }));
    expect(await within(row).findByText('Working')).toBeInTheDocument();
  });

  it('only lists CNC & Carpentry machines for booking', async () => {
    const { container } = renderAt('/cnc/machines/book', [['/cnc/machines/book', MachineBookingPage]]);
    expect(await screen.findByLabelText(/^machine/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector('select[aria-hidden="true"]')?.options.length).toBeGreaterThan(1);
    });
    const nativeSelect = container.querySelector('select[aria-hidden="true"]');
    const options = Array.from(nativeSelect.options, (option) => option.textContent);
    expect(options.some((option) => /laser cutter/i.test(option))).toBe(true);
    expect(options.some((option) => /podcast/i.test(option))).toBe(false);
  });

  it('opens the machine booking calendar', async () => {
    const user = userEvent.setup();
    renderAt('/cnc/machines/book', [['/cnc/machines/book', MachineBookingPage]]);
    await user.click(await screen.findByRole('button', { name: 'Date*' }));
    expect(await screen.findByRole('dialog', { name: 'Choose booking date' })).toBeInTheDocument();
  });

  it('redirects to safety courses on a missing pass and restores the booking draft on return', async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(
      http.get(`${API_BASE_URL}/facilities`, () => HttpResponse.json([{
        id: 'cnc-safety-required',
        name: 'CNC router',
        location: 'Workshop',
        capacity: 4,
        status: 'AVAILABLE',
        department: 'CNC',
        requiresSafetyPass: true,
      }])),
      http.get(`${API_BASE_URL}/bookings`, () => HttpResponse.json({
        items: [],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
      })),
      http.get(`${API_BASE_URL}/timetable/blocks`, () => HttpResponse.json([])),
      http.post(`${API_BASE_URL}/bookings`, () => HttpResponse.json({
        status: 409,
        detail: 'Safety training pass (CN5) required before booking this machine.',
      }, { status: 409 })),
    );

    renderAt('/cnc/machines/book', [
      ['/cnc/machines/book', MachineBookingPage],
      ['/cnc/safety', SafetyCoursePage],
    ]);
    await user.type(await screen.findByLabelText('Purpose*'), 'Test CNC booking');
    await user.type(screen.getByLabelText('Operator*'), 'Test operator');
    await user.click(screen.getByRole('button', { name: /request booking/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /safety course/i })).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/booking details are saved/i);
    expect(toastError).toHaveBeenCalledWith(
      'CNC safety pass required',
      expect.objectContaining({ description: expect.stringMatching(/complete the course/i) }),
    );

    await user.click(screen.getByRole('link', { name: /return to machine booking/i }));
    expect(await screen.findByLabelText('Purpose*')).toHaveValue('Test CNC booking');
    expect(screen.getByLabelText('Operator*')).toHaveValue('Test operator');
    expect(screen.getByRole('status')).toHaveTextContent(/booking details have been restored/i);
  });
});

describe('Safety course', () => {
  it('shows only safety courses', async () => {
    renderAt('/cnc/safety', [['/cnc/safety', SafetyCoursePage]]);
    expect(await screen.findByRole('heading', { level: 1, name: /safety course/i })).toBeInTheDocument();
    expect(await screen.findByText('Intro to CNC Safety')).toBeInTheDocument();
    expect(screen.queryByText('Media Production Fundamentals')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new session/i })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId('session-row-ts-1'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/registration managed by staff/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^sign up$/i })).not.toBeInTheDocument();
  });

  it('gives CNC-only users staff guidance and keeps their booking return available', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{
          pathname: '/cnc/safety',
          state: { returnToMachineBooking: true, bookingDraft: { purpose: 'Saved booking' } },
        }]}>
          <Routes>
            <Route
              path="/cnc/safety"
              element={<SafetyCoursePage token="test-token" roles={['ROLE_CNC_DOMAIN_OWNER']} canReadTraining={false} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/your current role cannot view training records/i);
    expect(screen.getByRole('link', { name: /return to machine booking/i })).toHaveAttribute('href', '/cnc/machines/book');
    expect(screen.queryByText(/loading training sessions/i)).not.toBeInTheDocument();
  });
});
