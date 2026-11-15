import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { backendApi } from '@/services/backend-api';
import { LiveDashboard } from './LiveDashboard';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LiveDashboard', () => {
  it('renders zero pipeline counts when the overview omits the stage breakdown', async () => {
    vi.spyOn(backendApi, 'dashboard').mockResolvedValue({
      totalSubmissions: 0,
      studentSubmissions: 0,
      generalSubmissions: 0,
      awaitingActionCount: 0,
      forwardedCount: 0,
      completedCount: 0,
      recentlyUpdatedCount: 0,
      awaitingReviewCount: 0,
      needsAttention: [],
    });
    vi.spyOn(backendApi, 'submissions').mockResolvedValue({ items: [] });

    const { container } = render(
      <MemoryRouter>
        <LiveDashboard token="test-token" roles={[]} onUnauthorized={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Pipeline at a glance')).toBeInTheDocument();
    expect([...container.querySelectorAll('.pipeline-tile b')].map((count) => count.textContent))
      .toEqual(Array(6).fill('0'));
  });
});
