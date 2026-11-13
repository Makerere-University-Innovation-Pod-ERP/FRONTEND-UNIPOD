import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MediaServicesPage } from './MediaServicesPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MediaServicesPage token="mock-token" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MediaServicesPage', () => {
  it('renders page heading, eyebrow and subtitle matching the design', async () => {
    renderPage();

    expect(await screen.findByText('OPERATIONS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /media services/i })).toBeInTheDocument();
    expect(
      screen.getByText(/podcast, photography, filming and production requests from intake to delivery/i),
    ).toBeInTheDocument();
  });

  it('renders the 4 status columns with correct labels', async () => {
    renderPage();

    expect(await screen.findByText('REQUESTED')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('IN PRODUCTION')).toBeInTheDocument();
    expect(screen.getByText('DELIVERED')).toBeInTheDocument();
  });

  it('renders all media request cards exactly matching the screenshot', async () => {
    renderPage();

    // Column 1: REQUESTED
    expect(await screen.findByText('Podcast — Innovation Spotlight Ep.12')).toBeInTheDocument();
    expect(screen.getByText('Grace Namuli')).toBeInTheDocument();

    // Column 2: SCHEDULED
    expect(screen.getByText('Product photography — Harvesting Kit')).toBeInTheDocument();
    expect(screen.getAllByText('Multimedia Studio A').length).toBeGreaterThanOrEqual(1);

    // Column 3: IN PRODUCTION
    expect(screen.getByText('Promo filming — UNIPOD Open Day')).toBeInTheDocument();
    expect(screen.getByText('Docuseries — Heritage Project ep.2')).toBeInTheDocument();
    expect(screen.getAllByText('Multimedia Studio B').length).toBe(2);
    expect(screen.getByText('Daniel Kato')).toBeInTheDocument();

    // Column 4: DELIVERED
    expect(screen.getByText('Partner MOU signing coverage')).toBeInTheDocument();
    expect(screen.getAllByText('Katia Birungi').length).toBe(3);
  });
});

