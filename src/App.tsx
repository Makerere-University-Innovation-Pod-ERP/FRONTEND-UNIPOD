import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackendWorkspace } from '@/components/BackendWorkspace';
import { clearSession, loadSession, saveSession, SUBMISSION_INTAKE_ROLES, type UserSession } from '@/lib/auth';
import { isFactFindingOfficer, isReviewer } from '@/lib/permissions';
import { LoginPage } from '@/pages/LoginPage';
import { LiveDashboard } from '@/pages/LiveDashboard';
import { LiveSubmissions } from '@/pages/LiveSubmissions';
import { ReceptionQueuePage } from '@/pages/ReceptionQueuePage';
import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { NewSubmissionPage } from '@/pages/NewSubmissionPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { SubmissionConfirmationPage } from '@/pages/SubmissionConfirmationPage';
import { SubmitterBriefPage } from '@/pages/SubmitterBriefPage';
import { MySubmissionsPage } from '@/pages/MySubmissionsPage';
import { FactFindingOverview } from '@/pages/fact-finding/FactFindingOverview';
import { FactFindingWorkspace } from '@/pages/fact-finding/FactFindingWorkspace';
import { FactFindingCaseFile } from '@/pages/fact-finding/FactFindingCaseFile';
import { ReviewerOverview } from '@/pages/reviewer/ReviewerOverview';
import { ReviewerWorkspace } from '@/pages/reviewer/ReviewerWorkspace';
import { ApiError, backendApi } from '@/services/backend-api';
import './api.css';
import './app.css';

const queryClient = new QueryClient();

function AccessRestricted({ label }: { label: string }) {
  return <div className="live-panel not-found-live"><p className="eyebrow">ACCESS RESTRICTED</p><h1>{label}</h1></div>;
}

function SubmissionWorkspaceRoute({
  session,
  onUnauthorized,
}: {
  session: UserSession;
  onUnauthorized: () => void;
}) {
  const { id = '' } = useParams<{ id: string }>();
  const hasIntakeRole = session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role));
  const isSubmitterOnly = session.roles.includes('ROLE_SUBMITTER') && !hasIntakeRole;
  if (id.startsWith('local-') || isSubmitterOnly) {
    return <SubmitterBriefPage key={id} session={session} onUnauthorized={onUnauthorized} />;
  }
  return <SubmissionDetailPage key={id} session={session} onUnauthorized={onUnauthorized} />;
}

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
  const canFactFind = isFactFindingOfficer(session.roles);
  const canReview = isReviewer(session.roles);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <BackendWorkspace session={session} health={health} onLogout={onLogout}>
        <Routes>
          <Route path="/" element={<LiveDashboard token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          <Route path="/submissions" element={<LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          <Route path="/submissions/student" element={<LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="student" />} />
          <Route path="/submissions/general" element={<LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="general" />} />
          <Route path="/my-submissions" element={session.roles.includes('ROLE_SUBMITTER') ? <MySubmissionsPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="This page is for submitter accounts." />} />
          <Route path="/reception" element={session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <ReceptionQueuePage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Your account cannot view the reception queue." />} />
          <Route path="/management" element={session.roles.includes('ROLE_ADMINISTRATOR') ? <AdminManagementPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Administrator access is required." />} />
          <Route path="/submissions/new" element={session.roles.includes('ROLE_SUBMITTER') || session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <NewSubmissionPage token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} /> : <AccessRestricted label="Your account cannot submit a brief." />} />
          <Route path="/submissions/:id/confirmation" element={<SubmissionConfirmationPage token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          <Route path="/submissions/:id" element={<SubmissionWorkspaceRoute session={session} onUnauthorized={onLogout} />} />
          <Route path="/fact-finding" element={canFactFind ? <FactFindingOverview token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/fact-finding/queue" element={canFactFind ? <FactFindingWorkspace token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/fact-finding/cases/:id" element={canFactFind ? <FactFindingCaseFile token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/reviewer" element={canReview ? <ReviewerOverview token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="The reviewer workspace is only available to reviewers." />} />
          <Route path="/reviewer/workspace" element={canReview ? <ReviewerWorkspace token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="The reviewer workspace is only available to reviewers." />} />
          <Route path="*" element={<div className="live-panel not-found-live"><p className="eyebrow">404 · NOT FOUND</p><h1>This page isn't in the workspace.</h1><a className="btn btn-primary" href="/">Return to overview</a></div>} />
        </Routes>
      </BackendWorkspace>
      </BrowserRouter>
    </QueryClientProvider>
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
