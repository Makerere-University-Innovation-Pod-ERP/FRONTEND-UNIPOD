import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Archive, ArrowUpRight, Bell, BookOpenCheck, BriefcaseBusiness, CheckCheck, ChevronDown, ChevronLeft, CircleHelp, ClipboardList, FileText, FolderKanban, Gauge, Inbox, Lightbulb, ListChecks, Menu, Search, Settings, X } from 'lucide-react';
import { useHub } from '@/lib/store';

const nav: { label:string; items:[string,string,typeof Gauge][] }[] = [
  { label:'WORKSPACE', items:[['Overview','/',Gauge],['All Submissions','/submissions',FolderKanban],['Student Projects','/submissions/student',BookOpenCheck],['General Innovations','/submissions/innovations',Lightbulb]] },
  { label:'PROCESS', items:[['Reception','/reception',Inbox],['Fact-Finding','/fact-finding',ClipboardList],['Reviews','/reviews',ListChecks],['Routing & Assignments','/routing',ArrowUpRight],['Refinement','/refinement',BriefcaseBusiness]] },
  { label:'MANAGEMENT', items:[['Documents','/documents',FileText],['Activity History','/activity',Activity],['Reports & Analytics','/reports',Archive],['Settings','/settings',Settings]] },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { state, setRole, markNotificationRead, markAllRead } = useHub();
  const noteDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<'profile'|'notifications'|'help'|null>(null);
  const matches = useMemo(() => query.trim() ? state.submissions.filter(s => `${s.title} ${s.code||''} ${s.category} ${s.stage} ${s.submitter}`.toLowerCase().includes(query.toLowerCase())).slice(0,5) : [], [query,state.submissions]);
  const activeLabel = nav.flatMap(group => group.items).find(item => item[1] === location)?.[0] || (location.startsWith('/submissions/') && !['/submissions/student','/submissions/innovations'].includes(location) ? 'Submission detail' : location.startsWith('/register') ? 'Register submission' : 'Innovation Hub');
  const side = <aside className={`hub-sidebar ${collapsed?'is-collapsed':''} ${drawer?'drawer-open':''}`}>
    <div className="brand-row">
      <div className="brand-mark"><span/><span/><span/><span/></div>
      {!collapsed && <div className="brand-name"><b>INNOVATION HUB</b><small>Project & Ideas Management</small></div>}
      <button className="icon-button sidebar-collapse" aria-label="Collapse navigation" data-testid="button-collapse-sidebar" onClick={()=>setCollapsed(!collapsed)}><ChevronLeft size={16}/></button>
      <button className="icon-button drawer-close" aria-label="Close menu" onClick={()=>setDrawer(false)}><X size={17}/></button>
    </div>
    <div className="sidebar-scroll nav-groups">
      {nav.map(group=><div className="nav-group" key={group.label}>
        {!collapsed && <div className="nav-heading">{group.label}</div>}
        {group.items.map(([label,href,Icon])=><Link key={href} href={href} data-testid={`link-nav-${href.replaceAll('/','-')||'overview'}`} title={collapsed?label:undefined} className={`nav-link ${location===href || (href==='/submissions'&&location==='/submissions')?'active':''}`} onClick={()=>setDrawer(false)}><Icon size={17}/>{!collapsed&&<span>{label}</span>}{!collapsed&&href==='/fact-finding'&&<small className="nav-count">{state.submissions.filter(s=>s.stage==='Fact-Finding').length}</small>}{!collapsed&&href==='/reception'&&<small className="nav-count">{state.submissions.filter(s=>['Draft','Received','Registered'].includes(s.stage)).length}</small>}</Link>)}
      </div>)}
    </div>
    {!collapsed && <div className="prototype-note"><div className="prototype-dot"/>Demonstration workspace<small>Local prototype · data stays here</small></div>}
    <button className="profile-card" data-testid="button-profile-menu" onClick={()=>setOpenMenu(openMenu==='profile'?null:'profile')}>
      <span className="avatar">{state.displayName.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>{!collapsed&&<span className="profile-copy"><b>{state.displayName}</b><small>{state.role}</small></span>}{!collapsed&&<ChevronDown size={15}/>}
    </button>
    {openMenu==='profile'&&<div className="profile-popover"><div className="popover-title">Demonstration role</div>{['Administrator','Innovation coordinator','Receiving officer','Reviewer','Fact-finding officer','Sector officer','IP liaison','Student submitter','Read-only observer'].map(role=><button key={role} data-testid={`button-role-${role.replaceAll(' ','-')}`} className="role-choice" onClick={()=>{setRole(role);setOpenMenu(null)}}>{role}{state.role===role&&<span className="check-dot"/>}</button>)}</div>}
  </aside>;
  return <div className="app-shell">
    {side}
    {drawer&&<button className="drawer-scrim" aria-label="Close navigation" onClick={()=>setDrawer(false)}/>}
    <div className="main-column">
      <header className="topbar">
        <div className="top-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setDrawer(true)}><Menu size={19}/></button><div className="crumb"><span>Workspace</span><i>/</i><b>{activeLabel}</b></div></div>
        <div className="top-actions">
          <div className="global-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search submissions…" aria-label="Search submissions" data-testid="input-global-search"/><kbd>⌘ K</kbd>
            {query&&<div className="search-results">{matches.length?matches.map(s=><Link href={`/submissions/${s.id}`} key={s.id} className="search-result" onClick={()=>setQuery('')}><span><b>{s.title}</b><small>{s.code||s.category} · {s.stage}</small></span><ArrowUpRight size={14}/></Link>):<div className="search-empty">No matching submissions</div>}</div>}
          </div>
          <div className="top-pop-wrap"><button className="icon-button notification-btn" aria-label="Notifications" data-testid="button-notifications" onClick={()=>setOpenMenu(openMenu==='notifications'?null:'notifications')}><Bell size={17}/>{state.notifications.some(n=>!n.read)&&<span className="notification-mark"/>}</button>{openMenu==='notifications'&&<div className="top-popover notification-popover"><div className="notification-head"><b>Notifications</b><button className="notification-read-all" onClick={()=>markAllRead()}><CheckCheck size={12}/> Mark all read</button></div><div className="notification-list">{state.notifications.slice(0,5).map(n=><Link href={n.link} key={n.id} className={`notification-item ${n.read?'':'unread'}`} data-testid={`notification-${n.id}`} onClick={()=>{markNotificationRead(n.id);setOpenMenu(null)}}><span><b>{n.title}</b><small>{n.body}</small><em>{noteDate(n.date)}</em></span><ArrowUpRight size={13}/></Link>)}{!state.notifications.length&&<p>No notifications yet.</p>}</div><Link href="/activity" onClick={()=>setOpenMenu(null)}>View activity history <ArrowUpRight size={13}/></Link></div>}</div>
          <div className="top-pop-wrap"><button className="icon-button" aria-label="Help" data-testid="button-help" onClick={()=>setOpenMenu(openMenu==='help'?null:'help')}><CircleHelp size={17}/></button>{openMenu==='help'&&<div className="top-popover"><b>Workspace guide</b><p>Use the stages as a flexible guide. Exact roles and destinations remain configurable.</p><Link href="/settings" onClick={()=>setOpenMenu(null)}>Review settings <ArrowUpRight size={13}/></Link></div>}</div>
          <Link href="/register" className="top-register" data-testid="link-register-top"><span>Register submission</span><span className="register-plus">+</span></Link>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="page-footer"><span>INNOVATION HUB <i>·</i> FRONTEND DEMO</span><span>Illustrative workflow · Data stays in this browser</span></footer>
    </div>
    <nav className="mobile-dock" aria-label="Quick navigation">
      <Link href="/" className={`dock-link ${location==='/'?'active':''}`} aria-label="Overview" data-testid="mobile-nav-overview" onClick={()=>setDrawer(false)}><Gauge size={19}/><span>Home</span></Link>
      <Link href="/submissions" className={`dock-link ${location.startsWith('/submissions')?'active':''}`} aria-label="Submissions" data-testid="mobile-nav-submissions" onClick={()=>setDrawer(false)}><FolderKanban size={19}/><span>Records</span></Link>
      <Link href="/register" className="dock-create" aria-label="Register submission" data-testid="mobile-nav-register"><span><span>+</span></span></Link>
      <Link href="/reviews" className={`dock-link ${location==='/reviews'?'active':''}`} aria-label="Reviews" data-testid="mobile-nav-reviews" onClick={()=>setDrawer(false)}><ListChecks size={19}/><span>Reviews</span></Link>
      <button className={`dock-link ${drawer?'active':''}`} aria-label="Open all sections" data-testid="mobile-nav-more" onClick={()=>setDrawer(!drawer)}><Menu size={19}/><span>More</span></button>
    </nav>
  </div>;
}
