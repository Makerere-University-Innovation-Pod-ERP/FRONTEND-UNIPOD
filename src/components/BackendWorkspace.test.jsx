import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackendWorkspace } from './BackendWorkspace';
import { submissions } from '@/mocks/fixtures/submissions';
import { resetNotificationMocks } from '@/mocks/handlers';

const session = {
  accessToken: 'test-token',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  subject: 'Joseph Lwanga',
  roles: ['ROLE_FACT_FINDING_OFFICER'],
};

function renderShell(currentSession = session, initialEntry = '/', onLogout = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BackendWorkspace session={currentSession} health="online" onLogout={onLogout}>
          <p>Page content</p>
          <CurrentPath />
        </BackendWorkspace>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function CurrentPath() {
  const { pathname } = useLocation();
  return <output data-testid="current-path">{pathname}</output>;
}

beforeEach(() => {
  resetNotificationMocks();
});

describe('BackendWorkspace', () => {
  it('toggles the sidebar collapsed state', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const sidebar = container.querySelector('.live-sidebar');
    expect(sidebar).not.toHaveClass('collapsed');

    const collapseToggle = screen.getByRole('button', { name: /collapse navigation/i });
    expect(collapseToggle.querySelector('svg')).toHaveClass('lucide-chevron-left');
    await user.click(collapseToggle);
    expect(sidebar).toHaveClass('collapsed');

    const expandToggle = screen.getByRole('button', { name: /expand navigation/i });
    expect(expandToggle.querySelector('svg')).toHaveClass('lucide-chevron-right');
    await user.click(expandToggle);
    expect(sidebar).not.toHaveClass('collapsed');
  });

  it('shows navigation tooltips only while sidebar labels are hidden', async () => {
    const user = userEvent.setup();
    renderShell();
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    const factFindingLink = within(navigation).getByRole('link', { name: 'Fact-Finding' });

    await user.hover(factFindingLink);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /collapse navigation/i }));
    await user.hover(factFindingLink);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Fact-Finding');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Investigate cases and record findings.');
  });

  it('shows app-bar tooltips on hover and keyboard focus', async () => {
    const user = userEvent.setup();
    renderShell();
    const notifications = screen.getByRole('button', { name: /notifications/i });

    await user.hover(notifications);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Notifications');
    expect(screen.getByRole('tooltip')).toHaveTextContent('View recent updates and alerts.');

    await user.unhover(notifications);
    fireEvent.focus(notifications);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Notifications');
  });

  it('shows submitters the submission registration action', () => {
    renderShell({ ...session, roles: ['ROLE_SUBMITTER'] });

    expect(screen.getByRole('link', { name: /submit an idea/i })).toHaveAttribute('href', '/submissions/new');
  });

  it('provides a separate mobile sign-out action for every role', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const { container } = renderShell(session, '/', onLogout);
    const mobileSignOut = container.querySelector('.mobile-signout-action');

    expect(mobileSignOut).toHaveAttribute('aria-label', 'Sign out');
    expect(mobileSignOut).toHaveTextContent('Sign out');
    await user.click(mobileSignOut);

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('uses responsive bottom navigation for every authenticated screen', async () => {
    const user = userEvent.setup();
    const { container } = renderShell({ ...session, roles: ['ROLE_ADMINISTRATOR'] }, '/reports-analytics');

    expect(container.querySelector('.live-shell')).toHaveClass('bottom-nav-shell');
    const quickNav = screen.getByRole('navigation', { name: 'Quick navigation' });
    expect(quickNav.querySelectorAll('a')).toHaveLength(3);

    const moreButton = screen.getByRole('button', { name: 'More navigation' });
    await user.click(moreButton);
    expect(container.querySelector('.live-sidebar')).toHaveClass('mobile-open');
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('applies responsive navigation to telecoms screens and highlights the current page', () => {
    const { container } = renderShell(
      { ...session, roles: ['ROLE_TELECOMS_DOMAIN_OWNER'] },
      '/telecoms/requests/new',
    );

    expect(container.querySelector('.live-shell')).toHaveClass('bottom-nav-shell');
    const quickNav = screen.getByRole('navigation', { name: 'Quick navigation' });
    expect(within(quickNav).getByRole('link', { name: 'New Request' })).toHaveClass('active');
    expect(within(quickNav).getByRole('button', { name: 'More navigation' })).toBeInTheDocument();
  });

  it('omits empty navigation groups for submitter-only accounts', () => {
    renderShell({ ...session, roles: ['ROLE_SUBMITTER'] });

    expect(screen.queryByText('INNOVATION PIPELINE')).not.toBeInTheDocument();
  });

  it('lists separate submitter pages after My Submissions and highlights the current page', () => {
    const { container } = renderShell({ ...session, roles: ['ROLE_SUBMITTER'] }, '/my-submissions/bookings');

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = Array.from(navigation.querySelectorAll('a'));
    expect(container.querySelector('.live-shell')).toHaveClass('bottom-nav-shell');
    expect(links.map((link) => link.textContent.trim())).toEqual([
      'My Submissions',
      'Service Requests',
      'Invoices and Payments',
      'Bookings',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/my-submissions',
      '/my-submissions/service-requests',
      '/my-submissions/invoices',
      '/my-submissions/bookings',
    ]);
    expect(within(navigation).getByRole('link', { name: 'Bookings' })).toHaveClass('active');
  });

  it('keeps My Submissions first and shows the full email address', () => {
    renderShell({
      ...session,
      subject: 'alvin69david',
      email: 'alvin69david@gmail.com',
      roles: ['ROLE_SUBMITTER', 'ROLE_ADMINISTRATOR'],
    });

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(navigation.querySelector('a')).toHaveTextContent('My Submissions');
    expect(screen.getByText('alvin69david@gmail.com')).toBeInTheDocument();
  });

  it('keeps the mobile menu toggle beside the brand and opens the sidebar', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    expect(container.querySelector('.live-topbar .mobile-nav-toggle')).toBeNull();
    const menuToggle = screen.getByRole('button', { name: 'Open navigation' });
    expect(menuToggle).toHaveClass('mobile-edge-nav-toggle');
    expect(menuToggle.querySelector('svg')).toHaveClass('lucide-chevron-right');
    expect(container.querySelector('.live-brand')).toContainElement(menuToggle);

    await user.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    expect(menuToggle.querySelector('svg')).toHaveClass('lucide-chevron-left');
    expect(container.querySelector('.live-sidebar')).toHaveClass('mobile-open');
  });

  it('searches submissions and shows matching results', async () => {
    const user = userEvent.setup();
    renderShell();
    const target = submissions[0];
    await user.click(screen.getByRole('button', { name: /search cases/i }));
    await user.type(screen.getByRole('textbox', { name: 'Search cases' }), target.title.slice(0, 6));
    expect(await screen.findByText(target.title)).toBeInTheDocument();
  });

  it('navigates to the notifications page when the bell is clicked', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await screen.findByTestId('current-path')).toHaveTextContent('/notifications');
  });
});
