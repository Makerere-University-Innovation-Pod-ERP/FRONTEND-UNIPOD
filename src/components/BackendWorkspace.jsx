import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowUpRight, Bell, Boxes, CheckCheck, ChevronLeft, CircleHelp, ClipboardList,
  LayoutDashboard, LogOut, Menu, Moon, Search, Settings2, Sun, Users, Workflow, X,
  Building2, Wrench, Video, Receipt, Handshake, GraduationCap, Lightbulb,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, backendApi } from '@/services/backend-api';
import { displayRole } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { formatDate } from '@/lib/presentation';

export function BackendWorkspace({
  session,
  health: _health,
  onLogout,
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
  const isAdministrator = session.roles.includes('ROLE_ADMINISTRATOR');
  const isSubmitter = session.roles.includes('ROLE_SUBMITTER');

  const navGroups = [
    {
      items: [
        { label: 'All Submissions', href: '/submissions', icon: Boxes },
        { label: 'Student Projects', href: '/submissions/student', icon: GraduationCap },
        { label: 'General Innovations', href: '/submissions/general', icon: Lightbulb },
        ...(isSubmitter ? [{ label: 'My Submissions', href: '/my-submissions', icon: Boxes }] : []),
      ],
    },
    {
      heading: 'INNOVATION PIPELINE',
      items: [
        { label: 'Reception', href: '/reception', icon: Workflow, badge: 3 },
        { label: 'Fact-Finding', href: '/fact-finding/queue', icon: ClipboardList, badge: 2 },
        { label: 'Reviews', href: '/reviewer/workspace', icon: Users, badge: 1 },
        { label: 'Routing & IP', href: '/routing', icon: ArrowUpRight, badge: 1 },
        { label: 'Refinement', href: '/refinement', icon: Workflow, badge: 2 },
      ],
    },
    {
      heading: 'OPERATIONS',
      items: [
        { label: 'Facilities & Bookings', href: '/operations/facilities', icon: Building2 },
        { label: 'Assets & Equipment', href: '/operations/assets', icon: Wrench },
        { label: 'Training & Mentorship', href: '/multimedia/training', icon: GraduationCap },
        { label: 'Media Services', href: '/multimedia/media', icon: Video },
      ],
    },
    {
      heading: 'FINANCE & PARTNERS',
      items: [
        { label: 'Price Lists & Invoices', href: '/finance/invoices', icon: Receipt },
        { label: 'Partners & MOUs', href: '/partners', icon: Handshake },
      ],
    },
    {
      heading: 'MANAGEMENT',
      items: [
        { label: 'Reports & Analytics', href: '/reports', icon: LayoutDashboard },
        { label: 'Activity History', href: '/activity', icon: Activity },
        ...(isAdministrator ? [{ label: 'Settings', href: '/management', icon: Settings2 }] : []),
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((group) => group.items);

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
    <div className="live-shell">
      <aside className={`live-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="live-brand">
          <Link to="/" className="live-brand-link" onClick={() => setMobileOpen(false)}>
            <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
            <span><b>UNIPOD ERP</b><small style={{ color: '#9db2a2' }}>Innovation & Operations</small></span>
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

        <nav className="live-nav" aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: '1 1 auto', overflowY: 'auto' }}>
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.heading && !collapsed && (
                <p className="live-nav-heading" style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', color: 'var(--sidebar-muted)', padding: '0 11px 5px', margin: 0 }}>
                  {group.heading}
                </p>
              )}
              {group.items.map(({ label, href, icon: Icon, badge }) => {
                const isActive = location === href || (href !== '/' && href !== '/submissions' && location.startsWith(href));
                return (
                  <Link
                    key={href}
                    to={href}
                    title={collapsed ? label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`live-nav-link ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'space-between',
                      padding: '0 11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <Icon size={16} style={{ flexShrink: 0 }} />
                      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
                    </div>
                    {!collapsed && badge !== undefined && (
                      <span
                        style={{
                          background: '#d9f27a',
                          color: '#21422f',
                          borderRadius: '10px',
                          padding: '1px 6px',
                          fontSize: '9px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          marginLeft: 'auto',
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div
            style={{
              margin: '12px 4px',
              padding: '10px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '7px',
              color: '#d6dfd7',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d7ef67', display: 'inline-block' }} />
              <span>Demonstration workspace</span>
            </div>
            <small style={{ display: 'block', fontSize: '9px', color: '#9db2a2', marginTop: '3px', fontWeight: 500 }}>
              Role-based prototype · sample data
            </small>
          </div>
        )}

        <div className="live-profile" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 6px 4px' }}>
          <span className="avatar" style={{ background: '#176b52', color: '#d7ef67', fontWeight: 800 }}>
            {name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </span>
          <span className="live-profile-copy">
            <b style={{ color: '#fff' }}>{name}</b>
            <small style={{ color: '#9db2a2' }}>{role}</small>
          </span>
          <button className="icon-button" onClick={onLogout} aria-label="Sign out" title="Sign out" style={{ color: '#c6d4c9' }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="live-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className="live-main">
        <header className="live-topbar" style={{ borderBottom: '1px solid #e2e6dc' }}>
          <button className="icon-button mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="live-breadcrumb">
            <span>Workspace</span>
            <i style={{ fontStyle: 'normal', margin: '0 6px', color: '#889186' }}>‹</i>
            <b>{allNavItems.find((item) => item.href === location || (item.href !== '/' && item.href !== '/submissions' && location.startsWith(item.href)))?.label ?? (location.includes('/training') ? 'Training & Mentorship' : location.includes('/media') ? 'Media Services' : location.includes('/partners') ? 'Partners & MOUs' : location.includes('/new') ? 'Register submission' : location.includes('/fact-finding/cases/') ? 'Fact-finding case file' : location.includes('/submissions/') ? 'Case file' : 'Innovation Hub')}</b>
          </div>
          <div className="live-top-actions">
            <button className="global-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search cases (Ctrl+K)">
              <Search size={14} /><span>Search submissions…</span><kbd>⌘K</kbd>
            </button>
            <div className="top-pop-wrap">
              <button className="top-circle-btn notification-btn" onClick={() => togglePopover('notifications')} aria-label="Notifications">
                <Bell size={15} />
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
            <button className="top-circle-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="top-pop-wrap">
              <button className="top-circle-btn" onClick={() => togglePopover('help')} aria-label="Help"><CircleHelp size={16} /></button>
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
            <Link
              to="/submissions/new"
              className="top-register"
              style={{ borderRadius: '9999px' }}
              data-testid="link-register-top"
            >
              <span>Register submission</span>
              <span className="register-plus">+</span>
            </Link>
          </div>
        </header>
        <main className="live-content">{children}</main>
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
