import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { backendApi } from '@/services/backend-api';
import { MySubmissionsPage } from './MySubmissionsPage';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage(capabilities, result = {
    items: [],
    page: 0,
    size: 25,
    totalElements: 0,
    totalPages: 0,
  }) {
  vi.spyOn(backendApi, 'submitterSubmissions').mockResolvedValue(result);
  vi.spyOn(backendApi, 'submitterCapabilities').mockResolvedValue(capabilities);

  return render(
    <MemoryRouter>
      <MySubmissionsPage token="test-token" onUnauthorized={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('MySubmissionsPage account capabilities', () => {
  it('renders the backend capabilities message and configured modules', async () => {
    renderPage({
      message: 'Your account can submit briefs.',
      modules: [
        { key: 'BRIEFS', label: 'Briefs', availability: 'AVAILABLE', reason: null },
        { key: 'SERVICE_REQUESTS', label: 'Service requests', availability: 'NOT_CONFIGURED', reason: 'Not enabled.' },
      ],
    });

    const capabilities = await screen.findByRole('region', { name: 'Account capabilities' });
    expect(within(capabilities).getByText('Your account can submit briefs.')).toBeInTheDocument();
    expect(within(capabilities).getByText('Service requests')).toBeInTheDocument();
    expect(within(capabilities).queryByText('Briefs')).not.toBeInTheDocument();
  });

  it('shows an explicit error when the capabilities response is invalid', async () => {
    renderPage({ message: 'Incomplete response' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The account capabilities response is invalid. Refresh the page or contact support.',
    );
    expect(screen.queryByRole('region', { name: 'Account capabilities' })).not.toBeInTheDocument();
  });

  it('filters the brief table by reference and switches to other sections', async () => {
    const user = userEvent.setup();
    renderPage(
      { message: 'You can manage your briefs.', modules: [] },
      {
        items: [
          {
            id: 'IH-26031',
            code: 'STU-2026-001',
            title: 'Smart Irrigation Monitoring System',
            category: 'student',
            stage: 'UNDER_REVIEW',
            receivedAt: '2026-10-08',
            updatedAt: '2026-10-17',
          },
          {
            id: 'IH-26029',
            code: 'STU-2026-002',
            title: 'Maternal Health Follow-up Platform',
            category: 'student',
            stage: 'REFINEMENT_REQUESTED',
            receivedAt: '2026-10-05',
            updatedAt: '2026-10-16',
          },
        ],
        page: 0,
        size: 25,
        totalElements: 2,
        totalPages: 1,
      },
    );

    expect(await screen.findByRole('table', { name: 'Brief submissions' })).toBeInTheDocument();
    expect(screen.getByText('Maternal Health Follow-up Platform')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search submissions' }), 'STU-2026-001');

    expect(screen.getByText('Smart Irrigation Monitoring System')).toBeInTheDocument();
    expect(screen.queryByText('Maternal Health Follow-up Platform')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Service requests' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('not yet built');
  });
});
