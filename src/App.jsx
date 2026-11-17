import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackendWorkspace } from '@/components/BackendWorkspace';
import {
  clearSession,
  canCreateSubmission,
  createSession,
  loadSession,
  saveSession,
  SUBMISSION_INTAKE_ROLES,
} from '@/lib/auth';
import {
  COORDINATOR_ONLY_REASON,
  isFactFindingOfficer,
  isFinanceOfficer,
  isMultimediaOfficer,
  isReceptionist,
  isInnovationCoordinator,
  isReviewer,
  isTelecomsDomainOwner,
  isTextileDomainOwner,
} from '@/lib/permissions';
import { TEXTILE_MODE_PIPELINE_LINKS, TEXTILE_MODE_WORKSPACE_LINKS } from '@/lib/textile-nav';
import { LoginPage } from '@/pages/LoginPage';
import { LiveDashboard } from '@/pages/LiveDashboard';
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
import { NewRequestPage } from '@/pages/telecoms/NewRequestPage';
import { RequestReviewPage } from '@/pages/telecoms/RequestReviewPage';
import { RequestBoardPage } from '@/pages/telecoms/RequestBoardPage';
import { RequestPage, RequestsIndexPage } from '@/pages/telecoms/RequestPage';
import { LabBookingPage } from '@/pages/telecoms/LabBookingPage';
import { EquipmentListPage } from '@/pages/telecoms/EquipmentListPage';
import { EquipmentLendingPage } from '@/pages/telecoms/EquipmentLendingPage';
import { BootcampSessionsPage } from '@/pages/telecoms/BootcampSessionsPage';
import { StockListPage as TelecomsStockListPage } from '@/pages/telecoms/StockListPage';
import { StockMovementPage as TelecomsStockMovementPage } from '@/pages/telecoms/StockMovementPage';
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
  const canFinance = isFinanceOfficer(session.roles);
  const canMultimedia = isMultimediaOfficer(session.roles);
  const isAdministrator = session.roles.includes('ROLE_ADMINISTRATOR');
  const mayCreateSubmission = canCreateSubmission(session.roles);
  const reception = (Page) => (canReception
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="The Reception screens are only available to reception staff." />);
  const textile = (Page) => (canTextile
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="Textile Operations is only available to the Textile domain owner." />);
  const finance = (Page) => (canFinance
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="Finance & Partners screens are only available to the Finance officer." />);
  const multimedia = (Page) => (canMultimedia
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="Multimedia screens are only available to the Multimedia officer." />);
  const canTelecoms = isTelecomsDomainOwner(session.roles) || isAdministrator;
  const telecoms = (Page) => (canTelecoms
    ? <Page token={session.accessToken} onUnauthorized={onLogout} />
    : <AccessRestricted label="Telecoms Operations is only available to the Telecoms domain owner." />);

  const isTelecoms = isTelecomsDomainOwner(session.roles);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <BackendWorkspace session={session} health={health} onLogout={onLogout} textileOnly={TEXTILE_ONLY}>
        <Routes>
          {isTelecoms ? (
            <>
              {/* Telecoms Operations (Domain 6: Assignment 11) - Only Telecoms screens */}
              <Route path="/" element={<Navigate to="/telecoms/requests" replace />} />
              <Route path="/overview" element={<Navigate to="/telecoms/requests" replace />} />
              <Route path="/telecoms" element={<Navigate to="/telecoms/requests" replace />} />
              <Route path="/telecoms/requests/new" element={telecoms(NewRequestPage)} />
              <Route path="/telecoms/review" element={telecoms(RequestReviewPage)} />
              <Route path="/telecoms/board" element={telecoms(RequestBoardPage)} />
              <Route path="/telecoms/requests" element={telecoms(RequestsIndexPage)} />
              <Route path="/telecoms/requests/:id" element={telecoms(RequestPage)} />
              <Route path="/telecoms/lab-booking" element={telecoms(LabBookingPage)} />
              <Route path="/telecoms/equipment" element={telecoms(EquipmentListPage)} />
              <Route path="/telecoms/equipment/lending" element={telecoms(EquipmentLendingPage)} />
              <Route path="/telecoms/bootcamps" element={telecoms(BootcampSessionsPage)} />
              <Route path="/telecoms/stock" element={telecoms(TelecomsStockListPage)} />
              <Route path="/telecoms/stock/movements" element={telecoms(TelecomsStockMovementPage)} />
              <Route path="*" element={<Navigate to="/telecoms/requests" replace />} />
            </>
          ) : (
            <>
              {TEXTILE_ONLY ? null : <>
          <Route path="/" element={
            session.roles.includes('ROLE_SUBMITTER') ? <Navigate to="/my-submissions" replace />
            : canReception ? <Navigate to="/reception/home" replace />
            : canFactFind ? <Navigate to="/fact-finding/queue" replace />
            : canReview ? <Navigate to="/reviewer/workspace" replace />
            : canCoordinate ? <Navigate to="/coordinator" replace />
            : canFinance ? <Navigate to="/finance/overview" replace />
            : canMultimedia ? <Navigate to="/multimedia/media" replace />
            : canTextile ? <Navigate to="/textile/board" replace />
            : <LiveDashboard token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} />} />
          {/* Multimedia & Finance Domain (Ssebyala Denis Ntendo) */}
          <Route path="/finance/overview" element={finance(FinanceOverviewPage)} />
          <Route path="/finance" element={finance(FinanceOverviewPage)} />
          <Route path="/multimedia/training" element={multimedia(TrainingMentorshipPage)} />
          <Route path="/operations/training" element={multimedia(TrainingMentorshipPage)} />
          <Route path="/training" element={multimedia(TrainingMentorshipPage)} />
          <Route path="/multimedia/media" element={multimedia(MediaServicesPage)} />
          <Route path="/operations/media" element={multimedia(MediaServicesPage)} />
          <Route path="/media" element={multimedia(MediaServicesPage)} />
          <Route path="/partners" element={canFinance ? <PartnersMousPage token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} /> : <AccessRestricted label="Finance & Partners screens are only available to the Finance officer." />} />
          <Route path="/multimedia/partners" element={canFinance ? <PartnersMousPage token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} /> : <AccessRestricted label="Finance & Partners screens are only available to the Finance officer." />} />
          <Route path="/operations/partners" element={canFinance ? <PartnersMousPage token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} /> : <AccessRestricted label="Finance & Partners screens are only available to the Finance officer." />} />
          <Route path="/finance/partners" element={canFinance ? <PartnersMousPage token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} /> : <AccessRestricted label="Finance & Partners screens are only available to the Finance officer." />} />
          <Route path="/finance/invoices" element={finance(PriceListsInvoicesPage)} />
          <Route path="/finance/prices" element={finance(PriceListsInvoicesPage)} />
          <Route path="/invoices" element={finance(PriceListsInvoicesPage)} />
          <Route path="/price-lists" element={finance(PriceListsInvoicesPage)} />

          {/* Submissions & Queues */}
          <Route path="/submissions" element={isAdministrator ? <LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} /> : <AccessRestricted label="The cross-domain submissions list is only available to administrators." />} />
          <Route path="/submissions/student" element={isAdministrator ? <LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="student" /> : <AccessRestricted label="The cross-domain submissions list is only available to administrators." />} />
          <Route path="/submissions/general" element={isAdministrator ? <LiveSubmissions token={session.accessToken} roles={session.roles} onUnauthorized={onLogout} fixedCategory="general" /> : <AccessRestricted label="The cross-domain submissions list is only available to administrators." />} />
          <Route path="/my-submissions" element={session.roles.includes('ROLE_SUBMITTER') ? <MySubmissionsPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="This page is for submitter accounts." />} />
          <Route path="/reception" element={session.roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) ? <ReceptionQueuePage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Your account cannot view the reception queue." />} />
          <Route path="/management" element={session.roles.includes('ROLE_ADMINISTRATOR') ? <AdminManagementPage token={session.accessToken} onUnauthorized={onLogout} /> : <AccessRestricted label="Administrator access is required." />} />
          <Route path="/submissions/new" element={mayCreateSubmission ? <NewSubmissionPage token={session.accessToken} onUnauthorized={onLogout} isSubmitter={session.roles.includes('ROLE_SUBMITTER')} /> : <AccessRestricted label="Your account cannot create submissions." />} />
          <Route path="/submissions/new/confirmation" element={mayCreateSubmission ? <BriefSubmittedPage isSubmitter={session.roles.includes('ROLE_SUBMITTER')} /> : <AccessRestricted label="Your account cannot create submissions." />} />
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
          {/* Telecoms Operations (Domain 6: Assignment 11) */}
          <Route path="/telecoms/requests/new" element={telecoms(NewRequestPage)} />
          <Route path="/telecoms/review" element={telecoms(RequestReviewPage)} />
          <Route path="/telecoms/board" element={telecoms(RequestBoardPage)} />
          <Route path="/telecoms/requests" element={telecoms(RequestsIndexPage)} />
          <Route path="/telecoms/requests/:id" element={telecoms(RequestPage)} />
          <Route path="/telecoms/lab-booking" element={telecoms(LabBookingPage)} />
          <Route path="/telecoms/equipment" element={telecoms(EquipmentListPage)} />
          <Route path="/telecoms/equipment/lending" element={telecoms(EquipmentLendingPage)} />
          <Route path="/telecoms/bootcamps" element={telecoms(BootcampSessionsPage)} />
          <Route path="/telecoms/stock" element={telecoms(TelecomsStockListPage)} />
          <Route path="/telecoms/stock/movements" element={telecoms(TelecomsStockMovementPage)} />
          {TEXTILE_ONLY && [...TEXTILE_MODE_WORKSPACE_LINKS, ...TEXTILE_MODE_PIPELINE_LINKS].map(({ href, label }) => (
            <Route key={href} path={href} element={<OtherModulePage title={label} />} />
          ))}
          {TEXTILE_ONLY && <Route path="*" element={<Navigate to={TEXTILE_HOME} replace />} />}
          {!TEXTILE_ONLY && <Route path="*" element={<div className="live-panel not-found-live"><p className="eyebrow">404 · NOT FOUND</p><h1>This page isn't in the workspace.</h1><a className="btn btn-primary" href="/">Return to overview</a></div>} />}
            </>
          )}
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
    return saved;
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
    setSession(null);
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
  if (!session && showSignUp) return <SignUpPage onBackToSignIn={() => setShowSignUp(false)} onLogin={acceptSession} />;
  if (!session) return <LoginPage onLogin={acceptSession} onCreateAccount={() => setShowSignUp(true)} />;
  return <AuthenticatedApp session={session} health={health} onLogout={logout} />;
}

export default App;
