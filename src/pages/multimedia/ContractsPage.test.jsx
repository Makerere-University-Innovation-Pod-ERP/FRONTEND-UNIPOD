import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ContractsPage } from './ContractsPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContractsPage token="test-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ContractsPage', () => {
  it('renders the contract list with codes and status badges', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: /event-coverage contracts/i })).toBeInTheDocument();
    const row = await screen.findByTestId('contract-row-ct-1');
    expect(within(row).getByText('MCTR-2026-0001')).toBeInTheDocument();
    expect(within(row).getByText('Signed')).toBeInTheDocument();
    expect(within(screen.getByTestId('contract-row-ct-2')).getByText('Draft')).toBeInTheDocument();
  });

  it('refuses to sign a draft until a signed document ID is given, then signs it', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('contract-row-ct-2'));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: /mark signed/i }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/signed contract document/i);

    await user.type(within(dialog).getByLabelText(/signed contract document id/i), '6a1f3c2e-0000-4000-8000-000000000099');
    await user.click(within(dialog).getByRole('button', { name: /mark signed/i }));

    expect(await within(dialog).findByRole('button', { name: /start coverage/i })).toBeInTheDocument();
  });

  it('only offers the transitions the backend allows', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId('contract-row-ct-1'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /start coverage/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /mark completed/i })).not.toBeInTheDocument();
  });

  it('creates a contract with a payment date and assigned staff', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /new contract/i }));
    await user.type(screen.getByLabelText('Client*'), 'Nile Breweries Foundation');
    await user.type(screen.getByLabelText('Event*'), 'Community Water Project Launch');
    fireEvent.change(screen.getByLabelText(/event date/i), { target: { value: '2026-12-10' } });
    await user.type(screen.getByLabelText('Place'), 'Jinja Community Hall');
    await user.type(screen.getByLabelText(/agreed price/i), '500000');
    await user.type(screen.getByLabelText(/assigned staff/i), 'Katia Birungi, Daniel Kato');
    await user.click(screen.getByRole('button', { name: /add payment date/i }));
    const milestone = screen.getByTestId('milestone-0');
    await user.type(within(milestone).getByLabelText('Label'), 'Deposit');
    fireEvent.change(within(milestone).getByLabelText(/due date/i), { target: { value: '2026-12-01' } });
    await user.click(screen.getByRole('button', { name: /create contract/i }));

    expect(await screen.findByText('Nile Breweries Foundation')).toBeInTheDocument();
  });
});
