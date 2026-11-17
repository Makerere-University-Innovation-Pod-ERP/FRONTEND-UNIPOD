import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StudentsFollowedUpPage } from './StudentsFollowedUpPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentsFollowedUpPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentsFollowedUpPage', () => {
  it('renders the page heading and mentorship follow-up rows', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /students followed up/i })).toBeInTheDocument();
    expect(screen.getByText('Brenda Ainembabazi')).toBeInTheDocument();
    expect(screen.getAllByText('Robinson Mugisha').length).toBeGreaterThan(0);
  });

  it('opens a follow-up and updates its status', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByTestId('followup-row-mf-3');
    await user.click(row);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Biogas Scrubbing Pilot Certification')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: /completed/i }));

    expect(await within(dialog).findByRole('radio', { name: /completed/i })).toBeChecked();
  });
});
