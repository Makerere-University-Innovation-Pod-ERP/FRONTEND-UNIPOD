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
        <ContractsPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ContractsPage', () => {
  it('renders the contract list with status badges', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /event-coverage contracts/i })).toBeInTheDocument();
    expect(await screen.findByText('Kampala AgriTech Collective')).toBeInTheDocument();
    expect(screen.getByText('Signed')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('opens a draft contract and marks it signed with a paperwork reference', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByTestId('contract-row-ct-2'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Annual Innovators Gala')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/paperwork reference/i), 'MOU-CT-2026-099');
    await user.click(within(dialog).getByRole('button', { name: /mark signed/i }));

    expect(await within(dialog).findByText('Signed')).toBeInTheDocument();
  });

  it('creates a new contract through the New contract form', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /new contract/i }));
    await user.type(screen.getByLabelText('Client*'), 'Nile Breweries Foundation');
    await user.type(screen.getByLabelText('Event*'), 'Community Water Project Launch');
    fireEvent.change(screen.getByLabelText(/event date/i), { target: { value: '2026-12-10' } });
    await user.type(screen.getByLabelText('Place*'), 'Jinja Community Hall');
    await user.type(screen.getByLabelText(/agreed price/i), '500000');
    await user.click(screen.getByRole('button', { name: /create contract/i }));

    expect(await screen.findByText('Nile Breweries Foundation')).toBeInTheDocument();
  });
});
