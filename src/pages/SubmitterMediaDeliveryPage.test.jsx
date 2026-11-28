import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import { server } from '@/mocks/server';
import { SubmitterMediaDeliveryPage } from './SubmitterMediaDeliveryPage';

describe('SubmitterMediaDeliveryPage', () => {
  it('does not present a scheduled request as delivered even if it has staged links', async () => {
    server.use(
      http.get(`${API_BASE_URL}/media/requests/:id`, () => HttpResponse.json({
        id: 'media-pending',
        code: 'MED-2026-009',
        title: 'Podcast interview',
        status: 'IN_PRODUCTION',
        deliveredAt: null,
        deliveryPayload: {
          delivery_links: [{ label: 'Preview', url: 'https://example.test/preview' }],
          file_ids: [],
          note_to_submitter: 'Work in progress.',
        },
      })),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/my-submissions/media/media-pending']}>
          <Routes>
            <Route
              path="/my-submissions/media/:id"
              element={<SubmitterMediaDeliveryPage token="submitter-token" />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('IN PRODUCTION')).toBeInTheDocument();
    expect(screen.getByText(/delivery links will appear here when the request is delivered/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your delivered files' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /preview/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Work in progress.')).not.toBeInTheDocument();
  });
});
