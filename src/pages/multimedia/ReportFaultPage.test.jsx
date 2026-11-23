import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReportFaultPage } from './ReportFaultPage';

function renderPage(initialEntries = ['/multimedia/equipment/report-fault']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ReportFaultPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportFaultPage', () => {
  it('renders the form with the equipment options loaded', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /report a fault/i })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Canon EOS R6/i })).toBeInTheDocument();
  });

  it('preselects the equipment from the ?equipment= query param', async () => {
    renderPage(['/multimedia/equipment/report-fault?equipment=eq-3']);

    const select = await screen.findByRole('combobox');
    await screen.findByRole('option', { name: /Zoom PodTrak/i });
    expect(select).toHaveValue('eq-3');
  });

  it('submits a fault report and shows the confirmation', async () => {
    const user = userEvent.setup();
    renderPage(['/multimedia/equipment/report-fault?equipment=eq-3']);

    await screen.findByRole('option', { name: /Zoom PodTrak/i });
    await user.type(screen.getByPlaceholderText(/what is wrong/i), 'Mixer channel 2 has no audio output.');
    await user.click(screen.getByRole('button', { name: /report fault/i }));

    expect(await screen.findByText(/fault reported for zoom podtrak p4 podcast mixer/i)).toBeInTheDocument();
  });
});
