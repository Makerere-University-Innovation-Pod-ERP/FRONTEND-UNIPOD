import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EquipmentLendingPage } from './EquipmentLendingPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EquipmentLendingPage token="test-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EquipmentLendingPage', () => {
  it('lists equipment loans from bookings and flags an overdue loan', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: /take equipment out/i })).toBeInTheDocument();
    const row = await screen.findByTestId('loan-row-bk-2');
    expect(within(row).getByText('Canon R6 camera kit')).toBeInTheDocument();
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
    expect(screen.queryByTestId('loan-row-bk-1')).not.toBeInTheDocument();
  });

  it('approves a pending loan, which takes the item out', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('loan-row-bk-3');
    await user.click(within(row).getByRole('button', { name: /approve/i }));
    expect(await within(row).findByText('Out')).toBeInTheDocument();
  });

  it('records a return with a condition note', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('loan-row-bk-2');
    await user.click(within(row).getByRole('button', { name: /mark returned/i }));
    await user.selectOptions(screen.getByLabelText(/condition on return/i), 'DAMAGED');
    await user.type(screen.getByLabelText(/condition note/i), 'Lens hood cracked.');
    await user.click(screen.getByRole('button', { name: /confirm return/i }));
    expect(await within(row).findByText('Returned')).toBeInTheDocument();
    expect(within(row).getByText(/back: damaged/i)).toBeInTheDocument();
  });

  it('requests a new loan, then declines it with a reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /request equipment loan/i }));
    await user.selectOptions(await screen.findByLabelText(/kept at/i), 'fac-studio-a');
    await user.type(screen.getByLabelText('Equipment*'), 'Zoom H6 recorder');
    await user.type(screen.getByLabelText(/^borrower name/i), 'Namubiru Claire');
    fireEvent.change(screen.getByLabelText(/^date out/i), { target: { value: '2027-03-01' } });
    fireEvent.change(screen.getByLabelText(/expected return date/i), { target: { value: '2027-03-02' } });
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    const row = (await screen.findByText('Zoom H6 recorder')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /decline/i }));
    await user.type(screen.getByLabelText(/reason/i, { selector: 'textarea' }), 'Needed in studio that week.');
    await user.click(screen.getByRole('button', { name: /decline loan/i }));
    expect(await within(row).findByText('Needed in studio that week.')).toBeInTheDocument();
  });

  it('requires the location, equipment and borrower before submitting', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /request equipment loan/i }));
    fireEvent.submit(screen.getByRole('button', { name: /submit for approval/i }).closest('form'));
    expect(await screen.findByText(/are required/i)).toBeInTheDocument();
  });
});
