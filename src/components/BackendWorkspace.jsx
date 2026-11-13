import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowLeftRight, ArrowUpRight, Bell, Boxes, CalendarDays, CheckCheck, ChevronLeft, CircleHelp, ClipboardList,
  Cog, FileText, Grid2x2, LayoutDashboard, LayoutGrid, List, LogOut, Menu,
  Moon, Plus, Search, Settings2, ShieldCheck, Sun, TriangleAlert, Upload, Users, Workflow, X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { stageCount, TEXTILE_MODE_PIPELINE_LINKS, TEXTILE_MODE_WORKSPACE_LINKS } from '@/lib/textile-nav';
import { useEffect, useState } from 'react';
import { ApiError, backendApi } from '@/services/backend-api';
import { displayRole, SUBMISSION_INTAKE_ROLES } from '@/lib/auth';
import {
  isFactFindingOfficer,
  isInnovationCoordinator,
  isReviewer,
  isTextileDomainOwner,
} from '@/lib/permissions';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { formatDate } from '@/lib/presentation';

function buildNavigation(roles) {
  const items = [
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
  if (isInnovationCoordinator(roles)) {
    items.push({ label: 'Coordinator Briefs', href: '/coordinator', icon: Workflow });
    items.push({ label: 'Ideas Being Improved', href: '/coordinator/improvements', icon: ArrowLeftRight });
  }
  return items;
}

/** Textile Operations section (Assignment: customer orders, stock and machines — instance 1 of 4). */
function buildTextileNavigation(roles) {
  if (!isTextileDomainOwner(roles)) return [];
  return [
    { label: 'New Order', href: '/textile/orders/new', icon: Upload },
    { label: 'Order Review & Quote', href: '/textile/review', icon: ClipboardList },
    { label: 'Order Board', href: '/textile/board', icon: LayoutGrid },
    { label: 'Order Page', href: '/textile/orders', icon: FileText },
    { label: 'Stock List', href: '/textile/stock', icon: List },
    { label: 'Add/Use Stock', href: '/textile/stock/movements', icon: ArrowLeftRight },
    { label: 'Machine List', href: '/textile/machines', icon: Cog },
    { label: 'Report a Fault', href: '/textile/machines/report', icon: TriangleAlert },
    { label: 'Book the Workshop', href: '/textile/bookings', icon: CalendarDays },
  ];
}

function isActiveLink(href, location) {
  if (location === href) return true;
  // An individual order page (/textile/orders/TXO-…) lights up the "Order page" entry.
  return href === '/textile/orders' && location.startsWith('/textile/orders/') && location !== '/textile/orders/new';
}

export function BackendWorkspace({
  session,
  health,
  onLogout,
  textileOnly = false,
  children,
}) {
  const { pathname: location } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openPopover, setOpenPopover] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const name = session.subject.includes('@') ? session.subject.split('@')[0] : session.subject;
  const role = session.roles[0] ? displayRole(session.roles[0]) : 'Authenticated user';
  // Textile-only mode (`npm run dev:textile`) shows just the Textile Operations section.
  const canCreate = !textileOnly && session.roles.some((userRole) => SUBMISSION_INTAKE_ROLES.includes(userRole));
  const isAdministrator = session.roles.includes('ROLE_ADMINISTRATOR');
  const isSubmitter = session.roles.includes('ROLE_SUBMITTER');
  const navigation = buildNavigation(session.roles);
  const links = textileOnly ? [] : [
    ...navigation,
    ...(isSubmitter ? [{ label: 'My submissions', href: '/my-submissions', icon: Boxes }] : []),
    { label: 'Student projects', href: '/submissions/student', icon: Boxes },
    { label: 'General innovations', href: '/submissions/general', icon: Boxes },
    ...(canCreate ? [{ label: 'Reception queue', href: '/reception', icon: Workflow }] : []),
    ...(isAdministrator ? [{ label: 'Management', href: '/management', icon: Settings2 }] : []),
  ];
  const textileLinks = buildTextileNavigation(session.roles);
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'sidebar-counts'],
    queryFn: ({ signal }) => backendApi.dashboard(session.accessToken, signal),
    enabled: textileOnly,
    staleTime: 60_000,
    retry: false,
  });
  const navSections = textileOnly
    ? [
      { heading: 'WORKSPACE', links: TEXTILE_MODE_WORKSPACE_LINKS },
      {
        heading: 'INNOVATION PIPELINE',
        links: TEXTILE_MODE_PIPELINE_LINKS.map((link) => ({ ...link, count: stageCount(overviewQuery.data, link.stages) })),
      },
      { heading: 'TEXTILE OPERATIONS', links: textileLinks },
    ]
    : [
      { heading: null, links },
      { heading: textileLinks.length ? 'TEXTILE OPERATIONS' : null, links: textileLinks },
    ];

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError('');
      setSearchResults([]);
      void backendApi.searchSubmissions(session.accessToken, query, 0, 10, controller.signal)
        .then((result) => setSearchResults(result.items))
        .catch((reason) => {
          if (reason instanceof ApiError && reason.status === 401) onLogout();
          else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
            setSearchError(reason instanceof Error ? reason.message : 'Could not search cases.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchOpen, searchQuery, session.accessToken, onLogout]);

  useEffect(() => {
    if (!searchOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [searchOpen]);

  const notificationsQuery = useNotifications(session.accessToken);
  const markAllRead = useMarkAllNotificationsRead(session.accessToken);
  const notificationItems = notificationsQuery.data ?? [];
  const hasUnread = notificationItems.some((item) => !item.read);

  const togglePopover = (name) => setOpenPopover((current) => (current === name ? null : name));

  return (
    <div className={`live-shell ${textileOnly || location.startsWith('/textile') ? 'textile-theme' : ''}`}>
      <aside className={`live-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="live-brand">
          <Link to={textileOnly ? '/textile/board' : '/'} className="live-brand-link" onClick={() => setMobileOpen(false)}>
            {textileOnly ? (
              <>
                <span className="tx-brand-mark" aria-hidden="true"><Grid2x2 size={18} strokeWidth={2.4} /></span>
                <span><b>UNIPOD ERP</b><small>Innovation & Operations</small></span>
              </>
            ) : (
              <>
                <img src="/mak-crest.png" alt="" aria-hidden="true" className="brand-crest" />
                <span><b>MUTIC ERP</b><small>Project & Ideas Management</small></span>
              </>
            )}
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
        {!textileOnly && <p className="live-nav-heading">WORKSPACE</p>}
        <nav className="live-nav" aria-label="Main navigation">
          {navSections.map((section, index) => (
            <div key={section.heading ?? index} className="live-nav-section">
              {section.heading && section.links.length > 0 && (
                <p className={`live-nav-heading ${index > 0 ? 'live-nav-subheading' : ''}`}>{section.heading}</p>
              )}
              {section.links.map(({ label, href, icon: Icon, count }) => (
                <Link
                  key={href}
                  to={href}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`live-nav-link ${isActiveLink(href, location) ? 'active' : ''}`}
                >
                  <Icon size={17} /><span>{label}</span>
                  {count > 0 && <em className="live-nav-count" aria-label={`${count} waiting`}>{count}</em>}
                </Link>
              ))}
            </div>
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
        {textileOnly ? (
          <div className="live-connection tx-demo-card">
            <span className="connection-dot online" />
            <span>Demonstration workspace</span>
            <small>Role-based prototype · sample data</small>
          </div>
        ) : <div className="live-connection">
          <span className={`connection-dot ${health}`} />
          <span>Backend {health === 'online' ? 'healthy' : health === 'reachable' ? 'reachable' : health === 'checking' ? 'connecting' : 'unavailable'}</span>
          <small>Render API</small>
        </div>}
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
          <div className="live-breadcrumb"><span>Workspace</span><i>/</i><b>{[...links, ...textileLinks].find((item) => isActiveLink(item.href, location))?.label ?? (location.includes('/new') ? 'Register submission' : location.includes('/fact-finding/cases/') ? 'Fact-finding case file' : location.includes('/submissions/') ? 'Case file' : 'MUTIC ERP')}</b></div>
          <div className="live-top-actions">
            <button className="global-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search cases (Ctrl+K)">
              <Search size={14} /><span>Search cases</span><kbd>Ctrl K</kbd>
            </button>
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
        <footer className="live-footer"><span>MUTIC ERP <i>·</i> MAKERERE UNIVERSITY</span><span><Activity size={12} /> Live data from the backend</span></footer>
      </div>
      {searchOpen && <div className="case-search-overlay" onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setSearchOpen(false);
          setSearchQuery('');
        }
      }}>
        <section className="case-search-dialog" role="dialog" aria-modal="true" aria-label="Search cases" onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const focusable = event.currentTarget.querySelectorAll('input, button:not([disabled])');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}>
          <div className="case-search-input">
            <Search size={16} aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchResults([]);
                setSearchError('');
                setSearchLoading(false);
              }}
              placeholder="Search by exact case code or title…"
              aria-label="Search cases"
              autoFocus
            />
            <button className="icon-button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} aria-label="Close search"><X size={15} /></button>
          </div>
          <div className="case-search-results" aria-live="polite">
            {searchLoading && <p className="global-search-message">Searching cases…</p>}
            {searchQuery.trim().length >= 2 && searchError && <p className="global-search-message api-error-text" role="alert">{searchError}</p>}
            {searchQuery.trim().length >= 2 && !searchLoading && !searchError && searchResults.length === 0 && <p className="global-search-message">No matching cases.</p>}
            {searchResults.map((item) => (
              <button
                className="case-search-result"
                key={item.id}
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  navigate(`/submissions/${item.id}`);
                }}
              >
                <span className="global-search-result"><b>{item.title}</b><small>{item.code || 'Draft'} · {item.category === 'student' ? 'Student project' : 'General innovation'} · {item.stage.replaceAll('_', ' ')}</small></span>
              </button>
            ))}
            {searchQuery.trim().length < 2 && <p className="global-search-message">Enter at least 2 characters to search case codes or titles.</p>}
          </div>
        </section>
      </div>}
    </div>
  );
}
