import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EquipmentListPage } from './EquipmentListPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EquipmentListPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EquipmentListPage', () => {
  it('renders the equipment register with state badges', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: /equipment register/i })).toBeInTheDocument();
    expect(await screen.findByText('Canon EOS R6 Mirrorless Camera')).toBeInTheDocument();
    expect(screen.getByText('MM-CAM-001')).toBeInTheDocument();
  });

  it('shows the faulty item as already flagged instead of offering to report it again', async () => {
    renderPage();

    await screen.findByText('Aputure 120d II LED Light Kit');
    expect(screen.getByText('Fault reported')).toBeInTheDocument();
  });

  it('links to the equipment lending page', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: /take equipment out/i })).toHaveAttribute('href', '/multimedia/equipment/lending');
  });
});
