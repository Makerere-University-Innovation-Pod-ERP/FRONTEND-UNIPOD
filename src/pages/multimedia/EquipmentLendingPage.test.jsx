import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EquipmentLendingPage } from './EquipmentLendingPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EquipmentLendingPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EquipmentLendingPage', () => {
  it('renders the loans table and flags the overdue active loan', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /take equipment out/i })).toBeInTheDocument();
    const row = (await screen.findByText('Kato Ivan')).closest('tr');
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
  });

  it('approves a pending loan', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('Nakato Patience')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /approve/i }));

    expect(await within(row).findByText(/on loan \(active\)/i)).toBeInTheDocument();
  });

  it('requests a new loan, then declines it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /request equipment loan/i }));
    await user.selectOptions(screen.getByLabelText('Equipment*'), 'eq-3');
    await user.type(screen.getByLabelText(/^borrower name/i), 'Namubiru Claire');
    await user.type(screen.getByLabelText(/^contact/i), '0701-998877');
    await user.type(screen.getByLabelText(/expected return date/i), '2026-11-25');
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    const row = (await screen.findByText('Namubiru Claire')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /decline/i }));

    expect(await within(row).findByText(/declined by manager/i)).toBeInTheDocument();
  });

  it('opens the request-loan form and requires the equipment and borrower fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /request equipment loan/i }));
    const submit = screen.getByRole('button', { name: /submit for approval/i });
    expect(submit).toBeDisabled();
  });
});
