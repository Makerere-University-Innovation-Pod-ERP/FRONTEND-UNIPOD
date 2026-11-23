import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StudentsFollowedUpPage } from './StudentsFollowedUpPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentsFollowedUpPage token="test-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentsFollowedUpPage', () => {
  it('renders follow-ups from the backend enums as readable labels', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: /students followed up/i })).toBeInTheDocument();
    const row = await screen.findByTestId('followup-row-mf-2');
    expect(within(row).getByText('Patrick Otim')).toBeInTheDocument();
    expect(within(row).getByText('Action Required')).toBeInTheDocument();
    expect(within(row).getByText('Urgent')).toBeInTheDocument();
  });

  it('opens a follow-up and updates its status', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('followup-row-mf-3'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Biogas Scrubbing Pilot Certification')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: /completed/i }));
    expect(await within(dialog).findByRole('radio', { name: /completed/i })).toBeChecked();
  });

  it('adds a new follow-up with a date', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /add follow-up/i }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/title/i), 'Pitch deck review');
    await user.type(within(dialog).getByLabelText(/mentee/i), 'Arthur Kanyike');
    await user.type(within(dialog).getByLabelText(/^mentor$/i), 'Grace Namuli');
    await user.type(within(dialog).getByLabelText(/follow-up date/i), '2026-12-12');
    await user.type(within(dialog).getByLabelText(/focus/i), 'Investor readiness');
    await user.click(within(dialog).getByRole('button', { name: /add follow-up/i }));

    expect(await screen.findByText('Arthur Kanyike')).toBeInTheDocument();
  });
});
