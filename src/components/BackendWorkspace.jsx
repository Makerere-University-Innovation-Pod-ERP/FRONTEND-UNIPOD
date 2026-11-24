import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, Bell, Boxes, CalendarDays, ChevronDown,
  ClipboardList, Cog, FileText, GraduationCap, Grid2x2, Handshake, LayoutDashboard, LayoutGrid, Lightbulb,
  List, LogOut, ChevronLeft, ChevronRight, Moon, Plus, Receipt, Search, Settings2, ShieldCheck, Sun, TriangleAlert, Upload, Users, Video,
  Workflow, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stageCount, TEXTILE_MODE_PIPELINE_LINKS, TEXTILE_MODE_WORKSPACE_LINKS } from '@/lib/textile-nav';
import { ApiError, backendApi } from '@/services/backend-api';
import { canCreateSubmission, displayRole, SUBMISSION_INTAKE_ROLES } from '@/lib/auth';
import {
  isFactFindingOfficer,
  isFinanceOfficer,
  isMultimediaOfficer,
  isReceptionist,
  isInnovationCoordinator,
  isReviewer,
  isTelecomsDomainOwner,
  isTextileDomainOwner,
  isCncDomainOwner,
} from '@/lib/permissions';
import { useTheme } from '@/hooks/useTheme';
import { Toaster } from '@/components/ui/sonner';
import {
  notificationKeys,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

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

/** Telecoms Operations section (Assignment 11: service requests, lab booking, equipment lending, bootcamps, stock). */
function buildTelecomsNavigation(roles) {
  if (!isTelecomsDomainOwner(roles) && !roles.includes('ROLE_ADMINISTRATOR')) return [];
  return [
    { label: 'New Request', href: '/telecoms/requests/new', icon: Upload },
    { label: 'Review & Quote', href: '/telecoms/review', icon: ClipboardList },
    { label: 'Request Board', href: '/telecoms/board', icon: LayoutGrid },
    { label: 'Requests', href: '/telecoms/requests', icon: FileText },
    { label: 'Lab Booking', href: '/telecoms/lab-booking', icon: CalendarDays },
    { label: 'Equipment Register', href: '/telecoms/equipment', icon: List },
    { label: 'Equipment Lending', href: '/telecoms/equipment/lending', icon: ArrowLeftRight },
    { label: 'Bootcamps & Training', href: '/telecoms/bootcamps', icon: Users },
    { label: 'Stock List', href: '/telecoms/stock', icon: Boxes },
    { label: 'Add/Use Stock', href: '/telecoms/stock/movements', icon: ArrowLeftRight },
  ];
}

function isActiveLink(href, location) {
  if (href === '/my-submissions' || href.startsWith('/my-submissions/')) return location === href;
  if (location === href) return true;
  if (href === '/overview' && location === '/') return true;
  if (href === '/textile/orders' && location.startsWith('/textile/orders/') && location !== '/textile/orders/new') return true;
  if (href === '/telecoms/requests' && location.startsWith('/telecoms/requests/') && location !== '/telecoms/requests/new') return true;
  if (href === '/telecoms/equipment') return location === '/telecoms/equipment';
  if (href === '/telecoms/stock') return location === '/telecoms/stock';
  if (href === '/multimedia/equipment') return location === '/multimedia/equipment';
  if (href === '/cnc/machines') return location === '/cnc/machines';
  if (href === '/cnc/board' && location.startsWith('/cnc/jobs/') && location !== '/cnc/jobs/new') return true;
  if (href !== '/' && href !== '/submissions' && location.startsWith(href)) return true;
  return false;
}

const NAV_DESCRIPTIONS = {
  Overview: 'See workspace activity, key metrics, and updates.',
  'Reports & Analytics': 'Review performance trends and operational reports.',
  'All Submissions': 'Review submissions received across the workspace.',
  'Student Projects': 'Browse and review student project submissions.',
  'General Innovations': 'Browse and review general innovation submissions.',
  Settings: 'Manage workspace accounts, roles, and configuration.',
  'Department Rules': 'Review the rules used by departments.',
  'My Submissions': 'Track your submissions and their progress.',
  'Service Requests': 'Review requests and responses for your submissions.',
  'Invoices and Payments': 'View invoices, balances, and payment status.',
  Bookings: 'View and manage your service bookings.',
  Reception: 'Triage new submissions and route them to the right team.',
  'Reception Home': 'Open reception tools and intake shortcuts.',
  'Missing Documents': 'Follow up on submissions that need documents.',
  'Walk-in Submission': 'Register a submission on behalf of a visitor.',
  'Fact-Finding': 'Investigate cases and record findings.',
  'Department Queue': 'Review cases awaiting a department response.',
  Reviews: 'Review assigned submissions and record decisions.',
  'Routing & IP': 'Route submissions to the right team and manage intellectual property review.',
  Refinement: 'Track submissions that need further development.',
  'Coordinator Briefs': 'Manage coordinator briefs and decisions.',
  'Ideas Being Improved': 'Track submissions moving through improvement.',
  'Training & Mentorship': 'Manage training sessions and mentorship follow-ups.',
  'Media Services': 'Review and manage media service requests.',
  'Students Followed Up': 'Track student follow-ups and outcomes.',
  'Book a Podcast Slot': 'Reserve a podcast recording time.',
  'Equipment Register': 'Browse equipment and its current status.',
  'Take Equipment Out': 'Record equipment loans and returns.',
  'Event Contracts': 'Review event agreements and contract details.',
  'New Order': 'Create a textile production order.',
  'Order Review & Quote': 'Check order details and prepare a quote.',
  'Order Board': 'Track textile orders by production stage.',
  'Order Page': 'Browse and update textile orders.',
  'Stock List': 'View available stock and inventory levels.',
  'Add/Use Stock': 'Record stock received, used, or corrected.',
  'Add / Use Stock': 'Record stock received, used, or corrected.',
  'Machine List': 'View machines, availability, and reported faults.',
  'Report a Fault': 'Report a machine issue for the workshop team.',
  'Book the Workshop': 'Reserve time in the textile workshop.',
  'New Job': 'Create a CNC or carpentry production job.',
  'Design Check & Quote': 'Review a design and prepare its quote.',
  'Job Board': 'Track CNC and carpentry jobs by stage.',
  'Book a Machine': 'Request time on an available workshop machine.',
  'Safety Course': 'View safety sessions and CN5 pass status.',
  'All Requests': 'Browse telecoms service requests.',
  Requests: 'Track telecoms requests, their status, and request details.',
  'New Request': 'Create a telecoms service request.',
  'Review & Quote': 'Review a telecoms request and prepare a quote.',
  'Request Board': 'Track telecoms requests by stage.',
  'Lab Booking': 'Reserve a telecoms lab session.',
  'Bootcamps & Training': 'Browse telecoms bootcamps and training sessions.',
  'Equipment Lending': 'Manage equipment loans and returns.',
  'Stock Inventory': 'View telecoms stock levels.',
  'Price Lists & Invoices': 'Manage service prices and customer invoices.',
  'Partners & MOUs': 'Manage partner records and agreements.',
};

function navigationDescription(label) {
  return NAV_DESCRIPTIONS[label] ?? 'Open this page to view and manage its information.';
}

export function BackendWorkspace({
  session,
  health: _health,
  onLogout,
  textileOnly = false,
  children,
}) {
  const { pathname: location } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const { theme, toggleTheme } = useTheme();

  const name = session.email || session.subject;
  const role = session.roles[0] ? displayRole(session.roles[0]) : 'Authenticated user';
  const isAdministrator = session.roles.includes('ROLE_ADMINISTRATOR');
  const isSubmitter = session.roles.includes('ROLE_SUBMITTER');
  const mayCreateSubmission = canCreateSubmission(session.roles);

  // Dynamic logic badges derived from live dashboard / pipeline stage counts
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: ({ signal }) => backendApi.dashboard(session.accessToken, signal),
    staleTime: 1000 * 30,
    enabled: isAdministrator || isInnovationCoordinator(session.roles),
  });

  const stageCounts = dashboard?.byStage ?? {};
  const receptionBadge = stageCounts.RECEIVED ?? 3;
  const factFindingBadge = stageCounts.FACT_FINDING ?? 2;
  const reviewBadge = stageCounts.UNDER_REVIEW ?? 1;

  const textileLinks = buildTextileNavigation(session.roles);
  const telecomsLinks = buildTelecomsNavigation(session.roles);

  const isTelecoms = isTelecomsDomainOwner(session.roles);
  const canReview = isReviewer(session.roles);
  const isFinance = isFinanceOfficer(session.roles);
  const isMultimedia = isMultimediaOfficer(session.roles);

  const telecomsNavGroups = [
    {
      heading: 'REQUESTS & PIPELINE',
      items: [
        { label: 'All Requests', href: '/telecoms/requests', icon: FileText },
        { label: 'New Request', href: '/telecoms/requests/new', icon: Upload },
        { label: 'Review & Quote', href: '/telecoms/review', icon: ClipboardList },
        { label: 'Request Board', href: '/telecoms/board', icon: LayoutGrid },
      ],
    },
    {
      heading: 'LAB & SKILLING',
      items: [
        { label: 'Lab Booking', href: '/telecoms/lab-booking', icon: CalendarDays },
        { label: 'Bootcamps & Training', href: '/telecoms/bootcamps', icon: Users },
      ],
    },
    {
      heading: 'EQUIPMENT & STOCK',
      items: [
        { label: 'Equipment Register', href: '/telecoms/equipment', icon: List },
        { label: 'Equipment Lending', href: '/telecoms/equipment/lending', icon: ArrowLeftRight },
        { label: 'Stock Inventory', href: '/telecoms/stock', icon: Boxes },
        { label: 'Add / Use Stock', href: '/telecoms/stock/movements', icon: ArrowLeftRight },
      ],
    },
  ];

  const standardNavGroups = [
    ...(isSubmitter ? [{
      heading: 'MY WORKSPACE',
      items: [
        { label: 'My Submissions', href: '/my-submissions', icon: Boxes },
        { label: 'Service Requests', href: '/my-submissions/service-requests', icon: ClipboardList },
        { label: 'Invoices and Payments', href: '/my-submissions/invoices', icon: Receipt },
        { label: 'Bookings', href: '/my-submissions/bookings', icon: CalendarDays },
      ],
    }] : []),
    ...(isAdministrator ? [{
      heading: 'MANAGEMENT',
      items: [
        { label: 'Overview', href: '/', icon: LayoutDashboard },
        { label: 'Reports & Analytics', href: '/reports-analytics', icon: Grid2x2 },
        { label: 'All Submissions', href: '/submissions', icon: Boxes },
        { label: 'Student Projects', href: '/submissions/student', icon: GraduationCap },
        { label: 'General Innovations', href: '/submissions/general', icon: Lightbulb },
        { label: 'Settings', href: '/management', icon: Settings2 },
        { label: 'Department Rules', href: '/rules/manager', icon: FileText },
      ],
    }] : []),
    {
      heading: 'INNOVATION PIPELINE',
      items: [
        ...(session.roles.some((r) => SUBMISSION_INTAKE_ROLES.includes(r))
          ? [{ label: 'Reception', href: '/reception', icon: Workflow, badge: receptionBadge }]
          : []),
        ...(isReceptionist(session.roles) ? [
          { label: 'Reception Home', href: '/reception/home', icon: ClipboardList },
          { label: 'Missing Documents', href: '/reception/missing-documents', icon: FileText },
          { label: 'Walk-in Submission', href: '/reception/walk-in', icon: Plus },
        ] : []),
        ...(isFactFindingOfficer(session.roles) ? [
          { label: 'Fact-Finding', href: '/fact-finding/queue', icon: ClipboardList, badge: factFindingBadge },
          { label: 'Department Queue', href: '/fact-finding/department', icon: ClipboardList },
        ] : []),
        ...(canReview ? [{ label: 'Reviews', href: '/reviewer/workspace', icon: Users, badge: reviewBadge }] : []),
        ...(isInnovationCoordinator(session.roles) ? [
          { label: 'Coordinator Briefs', href: '/coordinator', icon: Workflow },
          { label: 'Ideas Being Improved', href: '/coordinator/improvements', icon: ArrowLeftRight },
        ] : []),
      ],
    },
    ...(isMultimedia ? [{
      heading: 'MULTIMEDIA OPERATIONS',
      items: [
        { label: 'Training & Mentorship', href: '/multimedia/training', icon: GraduationCap },
        { label: 'Media Services', href: '/multimedia/media', icon: Video },
        { label: 'Students Followed Up', href: '/multimedia/mentorship', icon: Users },
        { label: 'Book a Podcast Slot', href: '/multimedia/podcast', icon: CalendarDays },
        { label: 'Equipment Register', href: '/multimedia/equipment', icon: List },
        { label: 'Take Equipment Out', href: '/multimedia/equipment/lending', icon: ArrowLeftRight },
        { label: 'Event Contracts', href: '/multimedia/contracts', icon: Handshake },
      ],
    }] : []),
    ...(textileLinks.length > 0 ? [{
      heading: 'TEXTILE OPERATIONS',
      items: textileLinks,
    }] : []),
    ...(isCncDomainOwner(session.roles) ? [{
      heading: 'CNC & CARPENTRY OPERATIONS',
      items: [
        { label: 'New Job', href: '/cnc/jobs/new', icon: Upload },
        { label: 'Design Check & Quote', href: '/cnc/review', icon: ClipboardList },
        { label: 'Job Board', href: '/cnc/board', icon: LayoutGrid },
        { label: 'Book a Machine', href: '/cnc/machines/book', icon: CalendarDays },
        { label: 'Machine List', href: '/cnc/machines', icon: Cog },
        { label: 'Safety Course', href: '/cnc/safety', icon: ShieldCheck },
        { label: 'Stock List', href: '/cnc/stock', icon: Boxes },
      ],
    }] : []),
    ...(telecomsLinks.length > 0 ? [{
      heading: 'TELECOMS OPERATIONS',
      items: telecomsLinks,
    }] : []),
    ...(isFinance ? [{
      heading: 'FINANCE & PARTNERS',
      items: [
        { label: 'Price Lists & Invoices', href: '/finance/invoices', icon: Receipt },
        { label: 'Partners & MOUs', href: '/partners', icon: Handshake },
      ],
    }] : []),
  ];

  const navGroups = isTelecoms
    ? telecomsNavGroups
    : standardNavGroups.filter((group) => group.items.length > 0);

  const textileNavSections = [
    { heading: 'WORKSPACE', links: TEXTILE_MODE_WORKSPACE_LINKS },
    {
      heading: 'INNOVATION PIPELINE',
      links: TEXTILE_MODE_PIPELINE_LINKS.map((link) => ({ ...link, count: stageCount(dashboard, link.stages) })),
    },
    { heading: 'TEXTILE OPERATIONS', links: textileLinks },
  ];

  const allNavItems = textileOnly
    ? textileNavSections.flatMap((s) => s.links)
    : navGroups.flatMap((group) => group.items);

  const showQuickNavMore = allNavItems.length > 4;
  const quickNavItems = (() => {
    if (!showQuickNavMore) return allNavItems;
    const activeItem = allNavItems.find((item) => isActiveLink(item.href, location));
    const leadingItems = allNavItems.slice(0, 2);
    if (activeItem && !leadingItems.some((item) => item.href === activeItem.href)) {
      return [...leadingItems, activeItem];
    }
    return [...leadingItems, allNavItems[2]];
  })();

  function showTooltip(event, title, description, placement = 'right') {
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontalCenter = rect.left + rect.width / 2;
    const verticalCenter = rect.top + rect.height / 2;
    setHoverTooltip({
      title,
      description,
      placement,
      pathname: location,
      left: placement === 'right'
        ? rect.right + 10
        : Math.min(Math.max(horizontalCenter, 125), window.innerWidth - 125),
      top: placement === 'right'
        ? Math.min(Math.max(verticalCenter, 40), window.innerHeight - 40)
        : rect.bottom + 8,
    });
  }

  function showSidebarTooltip(event, label) {
    const compactViewport = window.matchMedia?.('(max-width: 980px)').matches ?? false;
    if (!collapsed && !(compactViewport && !mobileOpen)) return;
    showTooltip(event, label, navigationDescription(label));
  }

  function showActionTooltip(event, title, description) {
    showTooltip(event, title, description, 'below');
  }

  function tooltipEvents(handler) {
    return {
      onMouseEnter: (event) => handler(event),
      onMouseLeave: () => setHoverTooltip(null),
      onFocus: (event) => handler(event),
      onBlur: () => setHoverTooltip(null),
    };
  }

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

  const unreadCountQuery = useUnreadNotificationCount(session.accessToken);
  const unreadCount = unreadCountQuery.data ?? 0;

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handlePushMessage = (event) => {
      const notification = event.data?.notification;
      if (event.data?.type !== 'PUSH_NOTIFICATION' || !notification) return;

      void queryClient.invalidateQueries({ queryKey: notificationKeys.list(session.accessToken) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(session.accessToken) });
    };
    navigator.serviceWorker.addEventListener('message', handlePushMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handlePushMessage);
  }, [queryClient, session.accessToken]);

  return (
    <div className={`live-shell bottom-nav-shell ${isTelecoms ? 'telecoms-theme' : textileOnly || location.startsWith('/textile') ? 'textile-theme' : ''} ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-nav-open' : ''}`}>
      <aside className={`live-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="live-brand">
          <Link
            to={isTelecoms ? '/telecoms/requests' : textileOnly ? '/textile/board' : '/'}
            className="live-brand-link"
            onClick={() => { setMobileOpen(false); setHoverTooltip(null); }}
            aria-label="MUTIC ERP home"
            {...tooltipEvents((event) => showSidebarTooltip(event, 'MUTIC ERP'))}
          >
            {isTelecoms ? (
              <>
                <img className="brand-logo" src="/makerere-logo.png" alt="Makerere University crest" />
                <span><b>MUTIC ERP</b><small>RF & IoT Operations</small></span>
              </>
            ) : textileOnly ? (
              <>
                <span className="tx-brand-mark" aria-hidden="true"><Grid2x2 size={18} strokeWidth={2.4} /></span>
                <span><b>MUTIC ERP</b><small>Textile Operations</small></span>
              </>
            ) : (
              <>
                <img className="brand-logo" src="/makerere-logo.png" alt="Makerere University crest" />
                <span><b>MUTIC ERP</b><small>Makerere Innovation Center</small></span>
              </>
            )}
          </Link>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => { setCollapsed((value) => !value); setHoverTooltip(null); }}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            {...tooltipEvents((event) => showTooltip(
              event,
              collapsed ? 'Expand navigation' : 'Collapse navigation',
              collapsed ? 'Show page names in the sidebar.' : 'Hide page names and keep the sidebar icons only.',
            ))}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button
            type="button"
            className="mobile-edge-nav-toggle"
            onClick={() => { setMobileOpen((value) => !value); setHoverTooltip(null); }}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            {...tooltipEvents((event) => showTooltip(
              event,
              mobileOpen ? 'Close navigation' : 'Open navigation',
              mobileOpen ? 'Hide the navigation panel.' : 'Show the navigation panel.',
            ))}
          >
            {mobileOpen ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}
          </button>
        </div>

        {textileOnly ? (
          <nav className="live-nav" aria-label="Main navigation">
            {textileNavSections.map((section, index) => (
              <div key={section.heading ?? index} className="live-nav-section">
                {section.heading && section.links.length > 0 && (
                  <p className={`live-nav-heading ${index > 0 ? 'live-nav-subheading' : ''}`}>{section.heading}</p>
                )}
                {section.links.map(({ label, href, icon: Icon, count }) => (
                  <Link
                    key={href}
                    to={href}
                    aria-label={label}
                    onClick={() => { setMobileOpen(false); setHoverTooltip(null); }}
                    className={`live-nav-link ${isActiveLink(href, location) ? 'active' : ''}`}
                    {...tooltipEvents((event) => showSidebarTooltip(event, label))}
                  >
                    <Icon size={17} /><span>{label}</span>
                    {count > 0 && <em className="live-nav-count" aria-label={`${count} waiting`}>{count}</em>}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        ) : (
          <nav className="live-nav" aria-label="Main navigation">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="live-nav-section">
                {group.heading && (
                  <p className={`live-nav-heading ${groupIdx > 0 ? 'live-nav-subheading' : ''}`}>{group.heading}</p>
                )}
                {group.items.map(({ label, href, icon: Icon, badge }) => (
                  <Link
                    key={href}
                    to={href}
                    aria-label={label}
                    onClick={() => { setMobileOpen(false); setHoverTooltip(null); }}
                    className={`live-nav-link ${isActiveLink(href, location) ? 'active' : ''}`}
                    {...tooltipEvents((event) => showSidebarTooltip(event, label))}
                  >
                    <Icon size={16} /><span>{label}</span>
                    {badge !== undefined && badge > 0 && (
                      <em className="live-nav-count" aria-label={`${badge} waiting`}>{badge}</em>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        )}

        {!collapsed && (
        <nav className="bottom-nav" aria-label="Quick navigation">
          {quickNavItems.map(({ label, href, icon: Icon, badge, count }) => (
            <Link
              key={href}
              to={href}
              aria-label={label}
              onClick={() => { setMobileOpen(false); setHoverTooltip(null); }}
              className={`bottom-nav-link ${isActiveLink(href, location) ? 'active' : ''}`}
            >
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
              {(badge ?? count) > 0 && (
                <em className="bottom-nav-count" aria-label={`${badge ?? count} waiting`}>{badge ?? count}</em>
              )}
            </Link>
          ))}
          {showQuickNavMore && (
            <button
              type="button"
              className="bottom-nav-link bottom-nav-more"
              onClick={() => { setMobileOpen(true); setHoverTooltip(null); }}
              aria-label="More navigation"
              aria-expanded={mobileOpen}
            >
              <Grid2x2 size={18} aria-hidden="true" /><span>More</span>
            </button>
          )}
        </nav>
        )}

        {!collapsed && isTelecoms && (
          <div className="live-sidebar-notice">
            <div><span className="dot" /><span>Telecoms Lab Workspace</span></div>
            <small>Domain 6 · RF & IoT Systems</small>
          </div>
        )}

        <div className="live-profile">
          <span className="avatar">
            {name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </span>
          <span className="live-profile-copy">
            <b>{name}</b>
            <small>{role}{!collapsed && <ChevronDown size={11} style={{ opacity: 0.7 }} />}</small>
          </span>
          <button
            className="icon-button"
            onClick={onLogout}
            aria-label="Sign out"
            {...tooltipEvents((event) => showTooltip(event, 'Sign out', 'End your session and sign out.'))}
          >
            <LogOut size={16} />
          </button>
        </div>
        <button
          type="button"
          className="mobile-signout-action"
          onClick={onLogout}
          aria-label="Sign out"
        >
          <LogOut size={15} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </aside>
      {mobileOpen && <button className="live-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className="live-main">
        <header className="live-topbar">
          <div className="live-breadcrumb">
            <span>{isTelecoms ? 'Telecoms Operations' : 'Workspace'}</span>
            <i style={{ fontStyle: 'normal', margin: '0 8px', color: '#64748b' }}>›</i>
            <b>{allNavItems.find((item) => isActiveLink(item.href, location))?.label ?? (location === '/notifications' ? 'Notifications' : location.includes('/telecoms/requests/new') ? 'New request' : location.includes('/telecoms/requests') ? 'Requests' : location.includes('/telecoms/review') ? 'Review & Quote' : location.includes('/telecoms/board') ? 'Request Board' : location.includes('/telecoms/lab-booking') ? 'Lab Booking' : location.includes('/telecoms/equipment/lending') ? 'Equipment Lending' : location.includes('/telecoms/equipment') ? 'Equipment Register' : location.includes('/telecoms/bootcamps') ? 'Bootcamp Sessions' : location.includes('/telecoms/stock/movements') ? 'Add / Use Stock' : location.includes('/telecoms/stock') ? 'Stock Inventory' : location.includes('/overview') || location === '/' ? 'Overview' : location.includes('/training') ? 'Training & Mentorship' : location.includes('/media') ? 'Media Services' : location.includes('/partners') ? 'Partners & MOUs' : location.includes('/new') ? (isSubmitter ? 'Submit an idea' : 'Register submission') : location.includes('/fact-finding/cases/') ? 'Fact-finding case file' : location.includes('/submissions/') ? 'Case file' : 'Innovation Hub')}</b>
          </div>
          <div className="live-top-actions">
            <button
              className="global-search-trigger"
              onClick={() => { setSearchOpen(true); setHoverTooltip(null); }}
              aria-label="Search cases (Ctrl+K)"
              {...tooltipEvents((event) => showActionTooltip(
                event,
                isTelecoms ? 'Search requests and equipment' : 'Search submissions',
                isTelecoms ? 'Find a request or equipment record.' : 'Find submissions by title or details.',
              ))}
            >
              <Search size={14} /><span>{isTelecoms ? 'Search requests & equipment…' : 'Search submissions…'}</span><kbd>⌘K</kbd>
            </button>
            {isTelecomsDomainOwner(session.roles) ? (
              <Link
                to="/telecoms/requests/new"
                className="btn btn-primary topbar-action-btn"
                {...tooltipEvents((event) => showActionTooltip(event, 'New request', 'Start a telecoms service request.'))}
              >
                <span>New request</span> <Plus size={15} />
              </Link>
            ) : null}
            <span
              className="live-secure"
              {...tooltipEvents((event) => showActionTooltip(event, 'Secure session', 'Your account is authenticated to this workspace.'))}
            >
              <ShieldCheck size={15} /> Secure session
            </span>
            <button
              className="top-circle-btn notification-btn"
              onClick={() => { navigate('/notifications'); setHoverTooltip(null); }}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              {...tooltipEvents((event) => showActionTooltip(event, 'Notifications', 'View recent updates and alerts.'))}
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="notification-count" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              className="top-circle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              {...tooltipEvents((event) => showActionTooltip(
                event,
                theme === 'dark' ? 'Light mode' : 'Dark mode',
                theme === 'dark' ? 'Switch to the light appearance.' : 'Switch to the dark appearance.',
              ))}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {mayCreateSubmission && !isTelecoms && (
              <Link
                to="/submissions/new"
                className="top-register"
                data-testid="link-register-top"
                {...tooltipEvents((event) => showActionTooltip(
                  event,
                  isSubmitter ? 'Submit an idea' : 'Register submission',
                  isSubmitter ? 'Start a new idea submission.' : 'Create a new submission record.',
                ))}
              >
                <span>{isSubmitter ? 'Submit an idea' : 'Register submission'}</span>
                <span className="register-plus">+</span>
              </Link>
            )}
          </div>
        </header>
        <main className="live-content">{children}</main>
        <footer className="live-footer"><span>MUTIC ERP <i>·</i> MAKERERE UNIVERSITY</span><span></span></footer>
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
            {searchLoading && <LoadingSkeleton label="Searching cases…" variant="compact" />}
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
      {hoverTooltip && hoverTooltip.pathname === location && !searchOpen && (
        <div
          id="workspace-hover-tooltip"
          className={`workspace-hover-tooltip is-${hoverTooltip.placement}`}
          role="tooltip"
          style={{ left: hoverTooltip.left, top: hoverTooltip.top }}
        >
          <strong>{hoverTooltip.title}</strong>
          <span>{hoverTooltip.description}</span>
        </div>
      )}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
