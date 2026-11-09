import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackendWorkspace } from './BackendWorkspace';
import type { UserSession } from '@/lib/auth';
import { submissions } from '@/mocks/fixtures/submissions';
import { notifications } from '@/mocks/fixtures/notifications';

const session: UserSession = {
  accessToken: 'test-token',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  subject: 'Joseph Lwanga',
  roles: ['ROLE_FACT_FINDING_OFFICER'],
};

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BackendWorkspace session={session} health="online" onLogout={vi.fn()}>
          <p>Page content</p>
        </BackendWorkspace>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BackendWorkspace', () => {
  it('toggles the sidebar collapsed state', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const sidebar = container.querySelector('.live-sidebar');
    expect(sidebar).not.toHaveClass('collapsed');

    await user.click(screen.getByRole('button', { name: /collapse navigation/i }));
    expect(sidebar).toHaveClass('collapsed');

    await user.click(screen.getByRole('button', { name: /expand navigation/i }));
    expect(sidebar).not.toHaveClass('collapsed');
  });

  it('searches submissions and shows matching results', async () => {
    const user = userEvent.setup();
    renderShell();
    const target = submissions[0];
    await user.click(screen.getByRole('button', { name: /search cases/i }));
    await user.type(screen.getByRole('textbox', { name: 'Search cases' }), target.title.slice(0, 6));
    expect(await screen.findByText(target.title)).toBeInTheDocument();
  });

  it('shows notifications in the bell popover', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    for (const item of notifications) {
      expect(await screen.findByText(item.title)).toBeInTheDocument();
    }
  });
});
