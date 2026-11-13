import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackendWorkspace } from '@/components/BackendWorkspace';
import { clearSession, createSession, loadSession, saveSession, SUBMISSION_INTAKE_ROLES } from '@/lib/auth';
import { isFactFindingOfficer, isReceptionist, isReviewer, isTextileDomainOwner } from '@/lib/permissions';
import {
  COORDINATOR_ONLY_REASON,
  isFactFindingOfficer,
  isInnovationCoordinator,
  isReviewer,
  isTextileDomainOwner,
} from '@/lib/permissions';
import { TEXTILE_MODE_PIPELINE_LINKS, TEXTILE_MODE_WORKSPACE_LINKS } from '@/lib/textile-nav';
import { LoginPage } from '@/pages/LoginPage';
import { LiveSubmissions } from '@/pages/LiveSubmissions';
import { ReceptionQueuePage } from '@/pages/ReceptionQueuePage';
import { AdminManagementPage } from '@/pages/admin/AdminManagementPage';
import { NewSubmissionPage } from '@/pages/NewSubmissionPage';
import { BriefSubmittedPage } from '@/pages/BriefSubmittedPage';
import { SubmissionDetailPage } from '@/pages/SubmissionDetailPage';
import { RespondToRequestPage } from '@/pages/RespondToRequestPage';
import { MySubmissionsPage } from '@/pages/MySubmissionsPage';
import { FactFindingOverview } from '@/pages/fact-finding/FactFindingOverview';
import { FactFindingWorkspace } from '@/pages/fact-finding/FactFindingWorkspace';
import { FactFindingCaseFile } from '@/pages/fact-finding/FactFindingCaseFile';
import { DepartmentQueue } from '@/pages/fact-finding/DepartmentQueue';
import { DepartmentResponsePage } from '@/pages/fact-finding/DepartmentResponsePage';
import { ReviewerOverview } from '@/pages/reviewer/ReviewerOverview';
import { ReviewerWorkspace } from '@/pages/reviewer/ReviewerWorkspace';
import { CoordinatorBriefPage } from '@/pages/coordinator/CoordinatorBriefPage';
import { CoordinatorDecisionPage } from '@/pages/coordinator/CoordinatorDecisionPage';
import { CoordinatorImprovementsPage } from '@/pages/coordinator/CoordinatorImprovementsPage';
import { CoordinatorChangesPage } from '@/pages/coordinator/CoordinatorChangesPage';
import { CoordinatorVersionsPage } from '@/pages/coordinator/CoordinatorVersionsPage';
import { TrainingMentorshipPage } from '@/pages/multimedia/TrainingMentorshipPage';
import { MediaServicesPage } from '@/pages/multimedia/MediaServicesPage';
import { PartnersMousPage } from '@/pages/multimedia/PartnersMousPage';
import { FinanceOverviewPage } from '@/pages/multimedia/FinanceOverviewPage';
import { PriceListsInvoicesPage } from '@/pages/multimedia/PriceListsInvoicesPage';
import { ReviewerCaseFile } from '@/pages/reviewer/ReviewerCaseFile';
import { NewOrderPage } from '@/pages/textile/NewOrderPage';
import { OrderReviewPage } from '@/pages/textile/OrderReviewPage';
import { OrderBoardPage } from '@/pages/textile/OrderBoardPage';
import { OrderPage, OrdersIndexPage } from '@/pages/textile/OrderPage';
import { StockListPage } from '@/pages/textile/StockListPage';
import { StockMovementPage } from '@/pages/textile/StockMovementPage';
import { MachineListPage } from '@/pages/textile/MachineListPage';
import { ReportFaultPage } from '@/pages/textile/ReportFaultPage';
import { WorkshopBookingPage } from '@/pages/textile/WorkshopBookingPage';
import { ReceptionHomePage } from '@/pages/reception/ReceptionHomePage';
import { BriefCheckPage } from '@/pages/reception/BriefCheckPage';
import { MissingDocumentsPage } from '@/pages/reception/MissingDocumentsPage';
import { SignUpPage } from '@/pages/reception/SignUpPage';
import { WalkInSubmissionPage } from '@/pages/reception/WalkInSubmissionPage';
import { WalkInSubmittedPage } from '@/pages/reception/WalkInSubmittedPage';
import { ApiError, backendApi } from '@/services/backend-api';
import './api.css';

const queryClient = new QueryClient();

// `npm run dev:textile` runs the app as the Textile Operations screens only:
// no login, no dashboard, every other route redirects to the order board.
const TEXTILE_ONLY = import.meta.env.MODE === 'textile';
const TEXTILE_HOME = '/textile/board';

// Sign up is mock-only for now: the real backend has public registration
// disabled (Reception QUESTIONS.md, Question 1).
const SIGN_UP_ENABLED = import.meta.env.VITE_ENABLE_MOCKS === 'true';

async function textileMockSession() {
  const { makeMockToken } = await import('@/mocks/jwt');
  return createSession({
    accessToken: makeMockToken(['ROLE_TEXTILE_DOMAIN_OWNER'], 'Faith Nabwire'),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
  });
}

/** Textile-only mode: sidebar links that belong to other teams' modules land here. */
function OtherModulePage({ title }) {
  return (
    <div className="live-page page-enter">
      <div className="live-panel not-found-live">
        <p className="eyebrow">OTHER MODULE</p>
        <h1>{title}</h1>
        <p>This module is built by another team. This workspace runs the Textile Operations screens only.</p>
        <a className="btn btn-primary" href={TEXTILE_HOME}>Go to the order board</a>
      </div>
    </div>
  );
}

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
  const canCoordinate = isInnovationCoordinator(session.roles);
  const canTextile = isTextileDomainOwner(session.roles);
  const canReception = isReceptionist(session.roles);
  const reception = (Page) => (canReception
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="The Reception screens are only available to reception staff." />);
  const textile = (Page) => (canTextile
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="Textile Operations is only available to the Textile domain owner." />);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <BackendWorkspace session={session} health={health} onLogout={onLogout} textileOnly={TEXTILE_ONLY}>
        <Routes>
          {TEXTILE_ONLY ? null : <>
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
          <Route path="/submissions/new/confirmation" element={session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <BriefSubmittedPage /> : <AccessRestricted label="Your account cannot create submissions." />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage session={session} onUnauthorized={onLogout} />} />
          <Route path="/submissions/:id/respond" element={session.roles.includes('ROLE_SUBMITTER') ? <RespondToRequestPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="This page is for submitter accounts." />} />
          {/* Reception (Assignment 3 - Peter Arnold Mukasa) */}
          <Route path="/reception/home" element={reception(ReceptionHomePage)} />
          <Route path="/reception/briefs/:id" element={reception(BriefCheckPage)} />
          <Route path="/reception/missing-documents" element={reception(MissingDocumentsPage)} />
          <Route path="/reception/walk-in" element={reception(WalkInSubmissionPage)} />
          <Route path="/reception/walk-in/confirmation" element={canReception ? <WalkInSubmittedPage staffName={session.subject} /> : <AccessRestricted label="The Reception screens are only available to reception staff." />} />
          <Route path="/fact-finding" element={canFactFind ? <FactFindingOverview token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/fact-finding/queue" element={canFactFind ? <FactFindingWorkspace token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/fact-finding/cases/:id" element={canFactFind ? <FactFindingCaseFile token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/fact-finding/department" element={canFactFind ? <DepartmentQueue token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/fact-finding/department/:id" element={canFactFind ? <DepartmentResponsePage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Fact-finding is only available to fact-finding officers." />} />
          <Route path="/reviewer" element={canReview ? <ReviewerOverview token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="The reviewer workspace is only available to reviewers." />} />
          <Route path="/reviewer/workspace" element={canReview ? <ReviewerWorkspace token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="The reviewer workspace is only available to reviewers." />} />
          <Route path="/coordinator" element={canCoordinate ? <CoordinatorBriefPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label={COORDINATOR_ONLY_REASON} />} />
          <Route path="/coordinator/briefs/:id" element={canCoordinate ? <CoordinatorBriefPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label={COORDINATOR_ONLY_REASON} />} />
          <Route path="/coordinator/briefs/:id/decision" element={canCoordinate ? <CoordinatorDecisionPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label={COORDINATOR_ONLY_REASON} />} />
          <Route path="/coordinator/improvements" element={canCoordinate ? <CoordinatorImprovementsPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label={COORDINATOR_ONLY_REASON} />} />
          <Route path="/coordinator/briefs/:id/changes" element={canCoordinate ? <CoordinatorChangesPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label={COORDINATOR_ONLY_REASON} />} />
          <Route path="/coordinator/briefs/:id/versions" element={canCoordinate ? <CoordinatorVersionsPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label={COORDINATOR_ONLY_REASON} />} />
          <Route path="/reviewer/cases/:id" element={canReview ? <ReviewerCaseFile token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="The reviewer workspace is only available to reviewers." />} />
          </>}
          <Route path="/textile/orders/new" element={textile(NewOrderPage)} />
          <Route path="/textile/review" element={textile(OrderReviewPage)} />
          <Route path="/textile/board" element={textile(OrderBoardPage)} />
          <Route path="/textile/orders" element={textile(OrdersIndexPage)} />
          <Route path="/textile/orders/:id" element={textile(OrderPage)} />
          <Route path="/textile/stock" element={textile(StockListPage)} />
          <Route path="/textile/stock/movements" element={textile(StockMovementPage)} />
          <Route path="/textile/machines" element={textile(MachineListPage)} />
          <Route path="/textile/machines/report" element={textile(ReportFaultPage)} />
          <Route path="/textile/bookings" element={textile(WorkshopBookingPage)} />
          {TEXTILE_ONLY && [...TEXTILE_MODE_WORKSPACE_LINKS, ...TEXTILE_MODE_PIPELINE_LINKS].map(({ href, label }) => (
            <Route key={href} path={href} element={<OtherModulePage title={label} />} />
          ))}
          {TEXTILE_ONLY && <Route path="*" element={<Navigate to={TEXTILE_HOME} replace />} />}
          {!TEXTILE_ONLY && <Route path="*" element={<div className="live-panel not-found-live"><p className="eyebrow">404 · NOT FOUND</p><h1>This page isn't in the workspace.</h1><a className="btn btn-primary" href="/">Return to overview</a></div>} />}
        </Routes>
      </BackendWorkspace>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = loadSession();
    // In textile-only mode a saved non-textile session would only ever see
    // "access restricted", so drop it and sign in as the textile owner instead.
    if (TEXTILE_ONLY && saved && !isTextileDomainOwner(saved.roles)) return null;
    return saved || DEFAULT_COORDINATOR_SESSION;
  });
  const [health, setHealth] = useState('checking');
  const [showSignUp, setShowSignUp] = useState(false);

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

  // Textile-only mode signs in as the Textile domain owner automatically
  // (also after "Sign out"), so the login page is never shown.
  useEffect(() => {
    if (!TEXTILE_ONLY || session) return;
    let active = true;
    void textileMockSession().then((next) => {
      if (active) acceptSession(next);
    });
    return () => {
      active = false;
    };
  }, [session, acceptSession]);

  if (!session && TEXTILE_ONLY) return null;
  if (!session && SIGN_UP_ENABLED && showSignUp) return <SignUpPage onBackToSignIn={() => setShowSignUp(false)} />;
  if (!session) return <LoginPage onLogin={acceptSession} onCreateAccount={SIGN_UP_ENABLED ? () => setShowSignUp(true) : undefined} />;
  return <AuthenticatedApp session={session} health={health} onLogout={logout} />;
}

export default App;
