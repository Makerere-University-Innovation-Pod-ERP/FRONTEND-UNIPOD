import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ArrowUpRight, Bell, Boxes, CheckCheck, ChevronLeft, CircleHelp, ClipboardList,
  LayoutDashboard, LogOut, Menu, Moon, Plus, Search, Settings2, ShieldCheck, Sun, Users, Workflow,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { displayRole, SUBMISSION_INTAKE_ROLES, type UserSession } from '@/lib/auth';
import { isFactFindingOfficer, isReviewer } from '@/lib/permissions';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { backendApi } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

function buildNavigation(roles: string[]): NavItem[] {
  const items: NavItem[] = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Submissions', href: '/submissions', icon: Boxes },
  ];
  if (isFactFindingOfficer(roles)) {
    items.push({ label: 'Fact-Finding Overview', href: '/fact-finding', icon: ClipboardList });
    items.push({ label: 'Fact-Finding', href: '/fact-finding/queue', icon: ClipboardList });
  }
  if (isReviewer(roles)) {
    items.push({ label: 'Reviewer Overview', href: '/reviewer', icon: Users });
    items.push({ label: 'Review Workspace', href: '/reviewer/workspace', icon: Users });
  }
  return items;
}

export function BackendWorkspace({
  session,
  health,
  onLogout,
  children,
}: {
  session: UserSession;
  health: 'checking' | 'online' | 'reachable' | 'offline';
  onLogout: () => void;
  children: ReactNode;
}) {
  const { pathname: location } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openPopover, setOpenPopover] = useState<'notifications' | 'help' | null>(null);
  const [query, setQuery] = useState('');
  const { theme, toggleTheme } = useTheme();
  const name = session.subject.includes('@') ? session.subject.split('@')[0] : session.subject;
  const role = session.roles[0] ? displayRole(session.roles[0]) : 'Authenticated user';
  const canCreate = session.roles.some((userRole) => SUBMISSION_INTAKE_ROLES.includes(userRole));
  const isAdministrator = session.roles.includes('ROLE_ADMINISTRATOR');
  const navigation = buildNavigation(session.roles);
  const links = [
    ...navigation,
    ...(canCreate ? [{ label: 'Reception queue', href: '/reception', icon: Workflow }] : []),
    ...(isAdministrator ? [{ label: 'Management', href: '/management', icon: Settings2 }] : []),
  ];

  const searchQuery = useQuery({
    queryKey: ['global-search', session.accessToken, query],
    queryFn: ({ signal }) => backendApi.submissions(session.accessToken, { q: query, size: 6 }, signal).then((page) => page.items),
    enabled: query.trim().length > 1,
  });
  const notificationsQuery = useNotifications(session.accessToken);
  const markAllRead = useMarkAllNotificationsRead(session.accessToken);
  const notificationItems = notificationsQuery.data ?? [];
  const hasUnread = notificationItems.some((item) => !item.read);

  const closeSearch = () => setQuery('');
  const togglePopover = (name: 'notifications' | 'help') => setOpenPopover((current) => (current === name ? null : name));

  return (
    <div className="live-shell">
      <aside className={`live-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="live-brand">
          <Link to="/" className="live-brand-link" onClick={() => setMobileOpen(false)}>
            <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
            <span><b>INNOVATION HUB</b><small>Project & Ideas Management</small></span>
          </Link>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <ChevronLeft size={13} style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>
        <p className="live-nav-heading">WORKSPACE</p>
        <nav className="live-nav" aria-label="Main navigation">
          {links.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={`live-nav-link ${location === href ? 'active' : ''}`}
            >
              <Icon size={17} /><span>{label}</span>
            </Link>
          ))}
          {canCreate && <Link
            to="/submissions/new"
            title={collapsed ? 'Register submission' : undefined}
            onClick={() => setMobileOpen(false)}
            className={`live-nav-link ${location === '/submissions/new' ? 'active' : ''}`}
          >
            <Plus size={17} /><span>Register submission</span>
          </Link>}
        </nav>
        <div className="live-connection">
          <span className={`connection-dot ${health}`} />
          <span>Backend {health === 'online' ? 'healthy' : health === 'reachable' ? 'reachable' : health === 'checking' ? 'connecting' : 'unavailable'}</span>
          <small>Render API</small>
        </div>
        <div className="live-profile">
          <span className="avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
          <span className="live-profile-copy"><b>{name}</b><small>{role}</small></span>
          <button className="icon-button" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>
      {mobileOpen && <button className="live-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className="live-main">
        <header className="live-topbar">
          <button className="icon-button mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="live-breadcrumb"><span>Workspace</span><i>/</i><b>{links.find((item) => item.href === location)?.label ?? (location.includes('/new') ? 'Register submission' : location.includes('/fact-finding/cases/') ? 'Fact-finding case file' : location.includes('/submissions/') ? 'Case file' : 'Innovation Hub')}</b></div>
          <div className="live-top-actions">
            <div className="top-pop-wrap">
              <div className="global-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search submissions…"
                  aria-label="Search submissions"
                />
                <kbd>⌘K</kbd>
              </div>
              {query.trim().length > 1 && (
                <div className="search-results">
                  {searchQuery.isLoading ? (
                    <div className="search-empty">Searching…</div>
                  ) : searchQuery.data?.length ? (
                    searchQuery.data.map((item) => (
                      <Link key={item.id} to={`/submissions/${item.id}`} className="search-result" onClick={closeSearch}>
                        <span><b>{item.title}</b><small>{item.code || 'Draft'} · {formatStage(item.stage)}</small></span>
                        <ArrowUpRight size={13} />
                      </Link>
                    ))
                  ) : (
                    <div className="search-empty">No matching submissions</div>
                  )}
                </div>
              )}
            </div>
            <span className="live-secure"><ShieldCheck size={15} /> Secure session</span>
            <button className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="top-pop-wrap">
              <button className="icon-button notification-btn" onClick={() => togglePopover('notifications')} aria-label="Notifications">
                <Bell size={16} />
                {hasUnread && <span className="notification-mark" />}
              </button>
              {openPopover === 'notifications' && (
                <div className="notification-popover">
                  <div className="notification-head">
                    <b>Notifications</b>
                    <button className="notification-read-all" onClick={() => markAllRead.mutate()} disabled={!hasUnread || markAllRead.isPending}>
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  </div>
                  <div className="notification-list">
                    {notificationsQuery.isLoading ? (
                      <p>Loading…</p>
                    ) : notificationsQuery.isError ? (
                      <p>Notifications aren't available for this account yet.</p>
                    ) : notificationItems.length ? (
                      notificationItems.map((item) => (
                        <Link
                          key={item.id}
                          to={item.link}
                          className={`notification-item ${item.read ? '' : 'unread'}`}
                          onClick={() => setOpenPopover(null)}
                        >
                          <span><b>{item.title}</b><small>{item.body}</small><em>{formatDate(item.createdAt)}</em></span>
                        </Link>
                      ))
                    ) : (
                      <p>No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="top-pop-wrap">
              <button className="icon-button" onClick={() => togglePopover('help')} aria-label="Help"><CircleHelp size={17} /></button>
              {openPopover === 'help' && (
                <div className="top-popover">
                  <b>Workspace guide</b>
                  <p>Stages are a flexible guide; exact roles and destinations remain configurable with the backend team.</p>
                  <a href="https://backend-unipod.onrender.com/api/actuator/health" target="_blank" rel="noreferrer" onClick={() => setOpenPopover(null)}>
                    Check backend health <ArrowUpRight size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="live-content">{children}</main>
        <footer className="live-footer"><span>INNOVATION HUB <i>·</i> MAKERERE UNIVERSITY</span><span><Activity size={12} /> Live data from the backend</span></footer>
      </div>
    </div>
  );
}
