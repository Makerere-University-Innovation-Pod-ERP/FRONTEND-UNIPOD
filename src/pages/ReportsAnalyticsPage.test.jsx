import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { backendApi } from '@/services/backend-api';
import { ReportsAnalyticsPage } from './ReportsAnalyticsPage';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage(data) {
  vi.spyOn(backendApi, 'dashboard').mockResolvedValue(data);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ReportsAnalyticsPage token="test-token" />
    </QueryClientProvider>,
  );
}

describe('ReportsAnalyticsPage', () => {
  it('renders dashboard stage, category, and completion data', async () => {
    renderPage({
      totalSubmissions: 10,
      studentSubmissions: 4,
      generalSubmissions: 6,
      completedCount: 1,
      awaitingActionCount: 3,
      awaitingReviewCount: 2,
      refinementRequestedCount: 1,
      byStage: { RECEIVED: 1, REGISTERED: 2, COMPLETED: 1 },
    });

    expect(await screen.findByRole('heading', { name: 'Reports & Analytics' })).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: 'Submission metrics' });
    expect(within(metrics).getByText('Active submissions')).toBeInTheDocument();
    expect(within(metrics).getByText('9')).toBeInTheDocument();
    expect(within(metrics).getByText('Awaiting action')).toBeInTheDocument();
    expect(within(metrics).getByText('Awaiting review')).toBeInTheDocument();
    expect(within(metrics).getByText('Refinement requested')).toBeInTheDocument();
    expect(within(metrics).getByText('3')).toBeInTheDocument();
    expect(within(metrics).getByText('2')).toBeInTheDocument();
    expect(within(metrics).getByText('1')).toBeInTheDocument();
    const stages = screen.getByRole('region', { name: 'Submissions by stage' });
    expect(within(stages).getByText('Received')).toBeInTheDocument();
    expect(within(stages).getByText('Registered')).toBeInTheDocument();
    expect(within(stages).getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /4 student projects, 6 general innovations/i })).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('1 of 10 submissions completed')).toBeInTheDocument();
  });

  it('shows empty report states when there is no submission data', async () => {
    renderPage({
      totalSubmissions: 0,
      studentSubmissions: 0,
      generalSubmissions: 0,
      completedCount: 0,
      byStage: {},
    });

    expect(await screen.findByText('No submissions have been recorded yet.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Completion rate' })).getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/payment trend data isn’t available/i)).toBeInTheDocument();
  });
});
