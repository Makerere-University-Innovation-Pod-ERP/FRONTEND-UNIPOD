import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { backendApi } from '@/services/backend-api';
import { MySubmissionsPage } from './MySubmissionsPage';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage(capabilities) {
  vi.spyOn(backendApi, 'submitterSubmissions').mockResolvedValue({
    items: [],
    page: 0,
    size: 25,
    totalElements: 0,
    totalPages: 0,
  });
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
});
