import { useCallback, useEffect, useState } from 'react';
import { Route, Router, Switch } from 'wouter';
import { BackendWorkspace } from '@/components/BackendWorkspace';
import { clearSession, loadSession, saveSession, SUBMISSION_INTAKE_ROLES, type UserSession } from '@/lib/auth';
import { LoginPage } from '@/pages/LoginPage';
import { LiveDashboard } from '@/pages/LiveDashboard';
import { LiveSubmissions } from '@/pages/LiveSubmissions';
import { ReceptionQueuePage } from '@/pages/ReceptionQueuePage';
import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { NewSubmissionPage } from '@/pages/NewSubmissionPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { MySubmissionsPage } from '@/pages/MySubmissionsPage';
import { ApiError, backendApi } from '@/services/backend-api';
import './api.css';
import './app.css';

type BackendHealth = 'checking' | 'online' | 'reachable' | 'offline';

function AuthenticatedApp({
  session,
  health,
  onLogout,
}: {
  session: UserSession;
  health: BackendHealth;
  onLogout: () => void;
}) {
  return (
    <Router>
      <BackendWorkspace session={session} health={health} onLogout={onLogout}>
        <Switch>
          <Route path="/" component={() => <LiveDashboard token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          <Route path="/submissions" component={() => <LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          <Route path="/submissions/student" component={() => <LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="student" />} />
          <Route path="/submissions/general" component={() => <LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="general" />} />
          <Route path="/my-submissions" component={() => session.roles.includes('ROLE_SUBMITTER') ? <MySubmissionsPage token={session.accessToken} onUnauthorized={onLogout} /> : <div className="live-panel not-found-live"><p className="eyebrow">ACCESS RESTRICTED</p><h1>This page is for submitter accounts.</h1></div>} />
          <Route path="/reception" component={() => session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <ReceptionQueuePage token={session.accessToken} onUnauthorized={onLogout} /> : <div className="live-panel not-found-live"><p className="eyebrow">ACCESS RESTRICTED</p><h1>Your account cannot view the reception queue.</h1></div>} />
          <Route path="/management" component={() => session.roles.includes('ROLE_ADMINISTRATOR') ? <AdminManagementPage token={session.accessToken} onUnauthorized={onLogout} /> : <div className="live-panel not-found-live"><p className="eyebrow">ACCESS RESTRICTED</p><h1>Administrator access is required.</h1></div>} />
          <Route path="/submissions/new" component={() => session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <NewSubmissionPage token={session.accessToken} onUnauthorized={onLogout} /> : <div className="live-panel not-found-live"><p className="eyebrow">ACCESS RESTRICTED</p><h1>Your account cannot create submissions.</h1></div>} />
          <Route path="/submissions/:id" component={() => <SubmissionDetailPage session={session} onUnauthorized={onLogout} />} />
          <Route><div className="live-panel not-found-live"><p className="eyebrow">404 · NOT FOUND</p><h1>This page isn't in the workspace.</h1><a className="btn btn-primary" href="/">Return to overview</a></div></Route>
        </Switch>
      </BackendWorkspace>
    </Router>
  );
}

function App() {
  const [session, setSession] = useState<UserSession | null>(() => loadSession());
  const [health, setHealth] = useState<BackendHealth>('checking');

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const checkHealth = () => {
      controller?.abort();
      controller = new AbortController();
      void backendApi.health(controller.signal)
        .then(() => {
          if (active) setHealth('online');
        })
        .catch((reason: unknown) => {
          if (!active || (reason instanceof DOMException && reason.name === 'AbortError')) return;
          if (reason instanceof ApiError && reason.status === 401) setHealth('reachable');
          else setHealth('offline');
        });
    };
    checkHealth();
    const interval = window.setInterval(checkHealth, 30_000);
    window.addEventListener('focus', checkHealth);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkHealth);
      controller?.abort();
    };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const acceptSession = useCallback((nextSession: UserSession) => {
    saveSession(nextSession);
    setSession(nextSession);
  }, []);

  if (!session) return <LoginPage onLogin={acceptSession} />;
  return <AuthenticatedApp session={session} health={health} onLogout={logout} />;
}

export default App;
