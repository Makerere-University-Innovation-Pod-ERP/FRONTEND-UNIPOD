import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackendWorkspace } from '@/components/BackendWorkspace';
import { clearSession, loadSession, saveSession, SUBMISSION_INTAKE_ROLES } from '@/lib/auth';
import { isFactFindingOfficer, isReviewer } from '@/lib/permissions';
import { LoginPage } from '@/pages/LoginPage';
import { LiveSubmissions } from '@/pages/LiveSubmissions';
import { ReceptionQueuePage } from '@/pages/ReceptionQueuePage';
import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { NewSubmissionPage } from '@/pages/NewSubmissionPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { MySubmissionsPage } from '@/pages/MySubmissionsPage';
import { FactFindingOverview } from '@/pages/fact-finding/FactFindingOverview';
import { FactFindingWorkspace } from '@/pages/fact-finding/FactFindingWorkspace';
import { FactFindingCaseFile } from '@/pages/fact-finding/FactFindingCaseFile';
import { ReviewerOverview } from '@/pages/reviewer/ReviewerOverview';
import { ReviewerWorkspace } from '@/pages/reviewer/ReviewerWorkspace';
import { TrainingMentorshipPage } from '@/pages/multimedia/TrainingMentorshipPage';
import { MediaServicesPage } from '@/pages/multimedia/MediaServicesPage';
import { PartnersMousPage } from '@/pages/multimedia/PartnersMousPage';
import { FinanceOverviewPage } from '@/pages/multimedia/FinanceOverviewPage';
import { PriceListsInvoicesPage } from '@/pages/multimedia/PriceListsInvoicesPage';
import { ApiError, backendApi } from '@/services/backend-api';
import './api.css';
import './app.css';

const queryClient = new QueryClient();

const DEFAULT_COORDINATOR_SESSION = {
  accessToken: 'mock-coordinator-token',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  subject: 'Grace Namuli',
  roles: ['ROLE_DEPARTMENT_COORDINATOR'],
};

function AccessRestricted({ label }) {
  return <div className="live-panel not-found-live"><p className="eyebrow">ACCESS RESTRICTED</p><h1>{label}</h1></div>;
}

function AuthenticatedApp({
  session,
  health,
  onLogout,
}) {
  const canFactFind = isFactFindingOfficer(session.roles);
  const canReview = isReviewer(session.roles);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <BackendWorkspace session={session} health={health} onLogout={onLogout}>
        <Routes>
          {/* Multimedia & Finance Domain (Ssebyala Denis Ntendo) */}
          <Route path="/" element={<FinanceOverviewPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/overview" element={<FinanceOverviewPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/finance/overview" element={<FinanceOverviewPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/finance" element={<FinanceOverviewPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/multimedia/training" element={<TrainingMentorshipPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/operations/training" element={<TrainingMentorshipPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/training" element={<TrainingMentorshipPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/multimedia/media" element={<MediaServicesPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/operations/media" element={<MediaServicesPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/media" element={<MediaServicesPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/partners" element={<PartnersMousPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/multimedia/partners" element={<PartnersMousPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/operations/partners" element={<PartnersMousPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/finance/partners" element={<PartnersMousPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/finance/invoices" element={<PriceListsInvoicesPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/finance/prices" element={<PriceListsInvoicesPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/invoices" element={<PriceListsInvoicesPage token={session.accessToken} onUnauthorized={onLogout} />} />
          <Route path="/price-lists" element={<PriceListsInvoicesPage token={session.accessToken} onUnauthorized={onLogout} />} />

          {/* Submissions & Queues */}
          <Route path="/submissions" element={<LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          <Route path="/submissions/student" element={<LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="student" />} />
          <Route path="/submissions/general" element={<LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="general" />} />
          <Route path="/my-submissions" element={session.roles.includes('ROLE_SUBMITTER') ? <MySubmissionsPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="This page is for submitter accounts." />} />
          <Route path="/reception" element={session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <ReceptionQueuePage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Your account cannot view the reception queue." />} />
          <Route path="/management" element={session.roles.includes('ROLE_ADMINISTRATOR') ? <AdminManagementPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Administrator access is required." />} />
          <Route path="/submissions/new" element={session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <NewSubmissionPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Your account cannot create submissions." />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage session={session} onUnauthorized={onLogout} />} />
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
  const [session, setSession] = useState(() => loadSession() || DEFAULT_COORDINATOR_SESSION);
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    let active = true;
    let controller = null;
    const checkHealth = () => {
      controller?.abort();
      controller = new AbortController();
      void backendApi.health(controller.signal)
        .then(() => {
          if (active) setHealth('online');
        })
        .catch((reason) => {
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
    setSession(DEFAULT_COORDINATOR_SESSION);
  }, []);

  const acceptSession = useCallback((nextSession) => {
    saveSession(nextSession);
    setSession(nextSession);
  }, []);

  if (!session) return <LoginPage onLogin={acceptSession} />;
  return <AuthenticatedApp session={session} health={health} onLogout={logout} />;
}

export default App;
