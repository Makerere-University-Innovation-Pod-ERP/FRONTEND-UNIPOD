import { Link, useLocation } from 'wouter';
import {
  Activity, Boxes, CircleHelp, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { displayRole, SUBMISSION_INTAKE_ROLES, type UserSession } from '@/lib/auth';

const navigation = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Submissions', href: '/submissions', icon: Boxes },
];

export function BackendWorkspace({
  session,
  health,
  onLogout,
  children,
}: {
  session: UserSession;
  health: 'checking' | 'online' | 'offline';
  onLogout: () => void;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const name = session.subject.includes('@') ? session.subject.split('@')[0] : session.subject;
  const role = session.roles[0] ? displayRole(session.roles[0]) : 'Authenticated user';
  const canCreate = session.roles.some((userRole) => SUBMISSION_INTAKE_ROLES.includes(userRole));

  return (
    <div className="live-shell">
      <aside className={`live-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link href="/" className="live-brand" onClick={() => setMobileOpen(false)}>
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
          <span><b>INNOVATION HUB</b><small>Project & Ideas Management</small></span>
        </Link>
        <p className="live-nav-heading">WORKSPACE</p>
        <nav className="live-nav" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`live-nav-link ${location === href ? 'active' : ''}`}
            >
              <Icon size={17} />{label}
            </Link>
          ))}
          {canCreate && <Link
            href="/submissions/new"
            onClick={() => setMobileOpen(false)}
            className={`live-nav-link ${location === '/submissions/new' ? 'active' : ''}`}
          >
            <Plus size={17} />Register submission
          </Link>}
        </nav>
        <div className="live-connection">
          <span className={`connection-dot ${health}`} />
          <span>Backend {health === 'online' ? 'connected' : health === 'checking' ? 'connecting' : 'unavailable'}</span>
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
          <div className="live-breadcrumb"><span>Workspace</span><i>/</i><b>{navigation.find((item) => item.href === location)?.label ?? (location.includes('/new') ? 'Register submission' : location.includes('/submissions/') ? 'Case file' : 'Innovation Hub')}</b></div>
          <div className="live-top-actions">
            <span className="live-secure"><ShieldCheck size={15} /> Secure session</span>
            <a className="icon-button live-help" href="https://backend-unipod.onrender.com/api/actuator/health" target="_blank" rel="noreferrer" aria-label="Backend health"><CircleHelp size={17} /></a>
          </div>
        </header>
        <main className="live-content">{children}</main>
        <footer className="live-footer"><span>INNOVATION HUB <i>·</i> MAKERERE UNIVERSITY</span><span><Activity size={12} /> Live data from the backend</span></footer>
      </div>
    </div>
  );
}
