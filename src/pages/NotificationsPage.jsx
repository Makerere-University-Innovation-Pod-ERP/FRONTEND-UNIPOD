import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Inbox,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { notificationTarget } from '@/services/notifications';
import { useBrowserPushNotifications } from '@/hooks/useBrowserPushNotifications';
import { LoadingSkeleton } from '@/components/ui/skeleton';
import './notifications.css';

const PAGE_SIZE = 20;

export function NotificationsPage({ token, roles = [] }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const unreadOnly = filter === 'unread';
  const notificationsQuery = useNotifications(token, {
    page,
    size: PAGE_SIZE,
    unread: unreadOnly,
  });
  const unreadCountQuery = useUnreadNotificationCount(token);
  const markAllRead = useMarkAllNotificationsRead(token);
  const markRead = useMarkNotificationRead(token);
  const browserPush = useBrowserPushNotifications(token);
  const data = notificationsQuery.data;
  const unreadCount = unreadCountQuery.data ?? 0;
  const isSubmitter = roles.includes('ROLE_SUBMITTER');
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const items = (data?.items ?? []).filter((item) => (
      isSubmitter || !isSubmitterBookingNotification(item)
    ));
    return query
      ? items.filter((item) => `${item.title} ${item.body}`.toLocaleLowerCase().includes(query))
      : items;
  }, [data?.items, isSubmitter, search]);
  const groups = useMemo(() => groupNotifications(visibleItems), [visibleItems]);

  const pushStatus = browserPush.loading
    ? 'Checking this browser…'
    : !browserPush.supported
      ? 'This browser cannot receive background alerts.'
      : !browserPush.enabled
        ? 'Background alerts are not configured for this workspace.'
        : browserPush.permission === 'denied'
          ? 'Notifications are blocked in your browser settings.'
          : browserPush.subscribed
            ? 'You are set to receive alerts on this browser.'
            : 'Get the important updates, even when the app is closed.';

  async function togglePush() {
    const wasSubscribed = browserPush.subscribed;
    const succeeded = wasSubscribed
      ? await browserPush.disable()
      : await browserPush.enable();
    if (succeeded) {
      toast.success(wasSubscribed ? 'Browser alerts paused' : 'Browser alerts are on');
    }
  }

  return (
    <div className="live-page notifications-page">
      <section className="inbox-hero" aria-labelledby="notifications-title">
        <div className="inbox-hero-copy">
          <p className="inbox-eyebrow"><Sparkles size={13} /> YOUR NOTIFICATION STUDIO</p>
          <h1 id="notifications-title">Stay in the <em>know.</em></h1>
          <p className="inbox-hero-description">
            The updates worth your attention, all in one place. Less chasing. More making moves.
          </p>
          <div className="inbox-hero-meta">
            <span><i /> {unreadCount} unread</span>
            <span>Refreshed as things happen</span>
          </div>
        </div>
        <div className="inbox-hero-art" aria-hidden="true">
          <div className="inbox-orbit inbox-orbit-one" />
          <div className="inbox-orbit inbox-orbit-two" />
          <div className="inbox-hero-bell"><BellRing size={30} strokeWidth={1.5} /></div>
          <div className="inbox-float-card">
            <span className="inbox-float-icon"><Sparkles size={14} /></span>
            <span><b>{unreadCount}</b><small>on your radar</small></span>
          </div>
          <span className="inbox-spark inbox-spark-one">✦</span>
          <span className="inbox-spark inbox-spark-two">✧</span>
        </div>
      </section>

      <div className="inbox-stats" aria-label="Notification summary">
        <div className="inbox-stat">
          <span className="inbox-stat-icon"><Inbox size={16} /></span>
          <span><b>{data ? data.totalElements : '—'}</b><small>{unreadOnly ? 'Unread updates' : 'All updates'}</small></span>
        </div>
        <div className="inbox-stat">
          <span className="inbox-stat-icon inbox-stat-unread"><BellRing size={16} /></span>
          <span><b>{unreadCountQuery.isLoading ? '—' : unreadCount}</b><small>Need a look</small></span>
        </div>
        <div className="inbox-stat">
          <span className="inbox-stat-icon inbox-stat-secure"><ShieldCheck size={16} /></span>
          <span><b>Private</b><small>Just for your account</small></span>
        </div>
      </div>

      <div className="inbox-layout">
        <section className="inbox-feed" aria-label="Notification activity">
          <div className="inbox-feed-heading">
            <div>
              <p className="eyebrow">YOUR ACTIVITY</p>
              <h2>The latest</h2>
            </div>
            <button
              type="button"
              className="inbox-mark-all"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              <CheckCheck size={15} />
              {markAllRead.isPending ? 'Catching up…' : 'Mark all read'}
            </button>
          </div>

          <div className="inbox-controls">
            <div className="inbox-tabs" role="group" aria-label="Filter notifications">
              <button
                type="button"
                aria-pressed={!unreadOnly}
                className={!unreadOnly ? 'active' : ''}
                onClick={() => {
                  setPage(0);
                  setFilter('all');
                }}
              >
                All activity
                {data && !unreadOnly && <span>{data.totalElements}</span>}
              </button>
              <button
                type="button"
                aria-pressed={unreadOnly}
                className={unreadOnly ? 'active' : ''}
                onClick={() => {
                  setPage(0);
                  setFilter('unread');
                }}
              >
                Unread
                <span>{unreadCount}</span>
              </button>
            </div>
            <label className="inbox-search">
              <Search size={15} />
              <input
                type="search"
                aria-label="Search notifications"
                placeholder="Search this page"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {(notificationsQuery.isError || unreadCountQuery.isError) && (
            <div className="inbox-error" role="alert">
              <span>We couldn’t load your notifications.</span>
              <button
                type="button"
                onClick={() => {
                  notificationsQuery.refetch();
                  unreadCountQuery.refetch();
                }}
              >
                Try again
              </button>
            </div>
          )}
          {(markRead.isError || markAllRead.isError) && (
            <p className="inbox-error-message" role="alert">
              We couldn’t update that notification. Please try again.
            </p>
          )}

          {notificationsQuery.isLoading ? (
            <LoadingSkeleton label="Gathering your updates…" variant="compact" />
            <div className="inbox-loading" role="status"><span />Gathering your updates…</div>
          ) : !notificationsQuery.isError && groups.length ? (
            <div className="inbox-groups">
              {groups.map(({ label, items }) => (
                <section className="inbox-group" key={label}>
                  <h3>{label}<span>{items.length}</span></h3>
                  <div className="inbox-list">
                    {items.map((item) => {
                      const meta = notificationMeta(item.type);
                      const Icon = meta.icon;
                      return (
                        <article
                          className={`inbox-item ${item.read ? 'is-read' : 'is-unread'}`}
                          key={item.id}
                        >
                          <span className={`inbox-item-icon ${meta.tone}`}><Icon size={18} /></span>
                          <div className="inbox-item-content">
                            <div className="inbox-item-meta">
                              <span className={`inbox-category ${meta.tone}`}>{meta.label}</span>
                              <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
                            </div>
                            <Link
                              className="inbox-item-link"
                              to={notificationTarget(item, roles)}
                              onClick={() => {
                                if (!item.read) markRead.mutate(item.id);
                              }}
                            >
                              <b>{item.title}</b>
                              <span>{item.body || 'There’s a new update for you.'}</span>
                              <em>Open update <ArrowUpRight size={13} /></em>
                            </Link>
                          </div>
                          <div className="inbox-item-action">
                            {!item.read ? (
                              <>
                                <span className="inbox-unread-label"><i /> New</span>
                                <button
                                  type="button"
                                  aria-label={`Mark as read: ${item.title}`}
                                  title="Mark as read"
                                  onClick={() => markRead.mutate(item.id)}
                                  disabled={markRead.isPending}
                                >
                                  <Check size={15} />
                                </button>
                              </>
                            ) : (
                              <span className="inbox-read-label"><Check size={14} /> Read</span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            !notificationsQuery.isError && (
              <div className="inbox-empty">
                <span><Inbox size={25} /></span>
                <h3>{search ? 'Nothing matches that search.' : unreadOnly ? 'You’re all caught up.' : 'It’s quiet in here.'}</h3>
                <p>
                  {search
                    ? 'Try another phrase and we’ll take another look.'
                    : unreadOnly
                      ? 'No unread updates. Go make something happen.'
                      : 'When there’s news worth knowing, it’ll land right here.'}
                </p>
              </div>
            )
          )}

          {data && data.totalPages > 1 && (
            <div className="inbox-pagination">
              <span>Page {page + 1} of {data.totalPages}</span>
              <div>
                <button
                  type="button"
                  aria-label="Previous notifications page"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Next notifications page"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage((current) => Math.min(data.totalPages - 1, current + 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="inbox-aside">
          <section className="inbox-push-card">
            <div className="inbox-aside-icon"><BellRing size={17} /></div>
            <p className="eyebrow">STAY IN THE LOOP</p>
            <h2>Make it a little more instant.</h2>
            <p className="inbox-push-description">{pushStatus}</p>
            {browserPush.enabled && browserPush.supported && browserPush.permission !== 'denied' && (
              <button
                type="button"
                className={`inbox-push-button ${browserPush.subscribed ? 'subscribed' : ''}`}
                disabled={browserPush.loading || browserPush.working}
                onClick={() => void togglePush()}
              >
                {browserPush.working
                  ? 'Updating…'
                  : browserPush.subscribed
                    ? 'Pause browser alerts'
                    : 'Enable browser alerts'}
                <ArrowUpRight size={14} />
              </button>
            )}
            {browserPush.error && <p className="inbox-push-error" role="alert">{browserPush.error}</p>}
            <div className="inbox-push-foot"><ShieldCheck size={13} /> Your alerts stay private to this browser.</div>
          </section>
          <div className="inbox-side-note">
            <span><Sparkles size={15} /></span>
            <p><b>A tiny reminder</b>Good work moves fast. Your inbox helps you keep up.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function notificationMeta(type = '') {
  const normalized = type.toUpperCase();
  if (normalized.includes('BOOKING')) return { icon: CalendarDays, label: 'Bookings', tone: 'gold' };
  if (normalized.includes('INVOICE') || normalized.includes('PAYMENT')) {
    return { icon: CircleDollarSign, label: 'Finance', tone: 'sage' };
  }
  if (normalized.includes('REVIEW') || normalized.includes('ASSIGNED')) {
    return { icon: ClipboardList, label: 'Review', tone: 'violet' };
  }
  if (normalized.includes('DOCUMENT') || normalized.includes('SUBMISSION') || normalized.includes('VERSION')) {
    return { icon: FileText, label: 'Casework', tone: 'blue' };
  }
  return { icon: BellRing, label: 'Update', tone: 'sage' };
}

function isSubmitterBookingNotification(item) {
  const linkPath = item.link?.split(/[?#]/, 1)[0];
  return item.entityType?.toLowerCase() === 'booking'
    || linkPath === '/my-submissions/bookings'
    || linkPath?.startsWith('/my-submissions/bookings/');
}

function groupNotifications(items) {
  const groups = new Map();
  for (const item of items) {
    const label = dateGroup(item.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }
  return [...groups.entries()].map(([label, groupedItems]) => ({ label, items: groupedItems }));
}

function dateGroup(value) {
  const date = new Date(value);
  const today = new Date();
  const startOfDay = (day) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const daysAgo = Math.floor((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return 'This week';
  return 'Earlier';
}

function formatTimestamp(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
