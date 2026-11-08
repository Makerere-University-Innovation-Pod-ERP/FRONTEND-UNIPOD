import { useCallback, useEffect, useState } from 'react';
import { Route, Router, Switch } from 'wouter';
import { BackendWorkspace } from '@/components/BackendWorkspace';
import { clearSession, loadSession, saveSession, SUBMISSION_INTAKE_ROLES, type UserSession } from '@/lib/auth';
import { LoginPage } from '@/pages/LoginPage';
import { LiveDashboard } from '@/pages/LiveDashboard';
import { LiveSubmissions } from '@/pages/LiveSubmissions';
import { NewSubmissionPage } from '@/pages/NewSubmissionPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { backendApi } from '@/services/backend-api';
import './api.css';
import './app.css';

type BackendHealth = 'checking' | 'online' | 'offline';

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
    const controller = new AbortController();
    backendApi.health(controller.signal)
      .then(() => setHealth('online'))
      .catch(() => setHealth('offline'));
    return () => controller.abort();
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
