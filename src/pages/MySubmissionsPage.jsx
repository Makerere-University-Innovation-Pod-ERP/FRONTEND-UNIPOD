import { useEffect, useState } from 'react';
import {
  CircleAlert,
  CircleHelp,
  FileText,
  Inbox,
  LockKeyhole,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { formatDate, formatStage } from '@/lib/presentation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useSubmitterCapabilities } from '@/hooks/useSubmitter';

function isSubmitterCapabilities(value) {
  return value !== null
    && typeof value === 'object'
    && typeof value.message === 'string'
    && Array.isArray(value.modules)
    && value.modules.every((module) => (
      module !== null
      && typeof module === 'object'
      && typeof module.key === 'string'
      && typeof module.label === 'string'
      && ['AVAILABLE', 'NOT_CONFIGURED'].includes(module.availability)
      && (module.reason === undefined || module.reason === null || typeof module.reason === 'string')
    ));
}

export function MySubmissionsPage({
  token,
  onUnauthorized,
}) {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // GET /me/capabilities, shared with BackendWorkspace's nav via the same query cache.
  const capabilitiesQuery = useSubmitterCapabilities(token);
  const capabilities = capabilitiesQuery.isSuccess && isSubmitterCapabilities(capabilitiesQuery.data)
    ? capabilitiesQuery.data
    : null;

  useEffect(() => {
    if (capabilitiesQuery.error instanceof ApiError && capabilitiesQuery.error.status === 401) onUnauthorized();
  }, [capabilitiesQuery.error, onUnauthorized]);

  useEffect(() => {
    if (capabilitiesQuery.isSuccess && !isSubmitterCapabilities(capabilitiesQuery.data)) {
      setError('The account capabilities response is invalid. Refresh the page or contact support.');
    }
  }, [capabilitiesQuery.isSuccess, capabilitiesQuery.data]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    backendApi.submitterSubmissions(token, { page, size: 25 }, controller.signal)
      .then(setResult)
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
        else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'Could not load your submissions.');
        }
      }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, page, onUnauthorized]);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const visibleSubmissions = (result?.items ?? []).filter((item) => {
    if (!normalizedSearch) return true;
    return [item.title, item.code, item.id, item.category, item.stage]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch));
  });

  return (
    <div className="live-page page-enter my-submissions-page">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">MY WORKSPACE · SUBMITTER HOME</p>
          <div className="my-submissions-title-row">
            <h1>My submissions</h1>
            {capabilities && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="my-submissions-access-trigger" aria-label="Account access details">
                      <CircleHelp size={15} aria-hidden="true" />
                      <span>Account access</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="my-submissions-access-tooltip" side="bottom" align="start" sideOffset={8}>
                    <div>
                      <p className="eyebrow">ACCOUNT ACCESS</p>
                      <p>{capabilities.message}</p>
                      {capabilities.modules.some((module) => module.availability === 'NOT_CONFIGURED') && (
                        <div className="locked-modules">
                          {capabilities.modules
                            .filter((module) => module.availability === 'NOT_CONFIGURED')
                            .map((module) => <span key={module.key}><LockKeyhole size={13} />{module.label}</span>)}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p>Track cases linked to your account. Your case records are read-only.</p>
        </div>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <section className="my-submissions-panel">
          <div className="my-submissions-toolbar">
            <div className="my-submissions-table-heading">
              <span className="my-submissions-heading-icon"><FileText size={17} /></span>
              <div>
                <h2>Brief submissions</h2>
                <p>Review the status and latest activity on your briefs.</p>
              </div>
            </div>
            <label className="my-submissions-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search submissions"
                placeholder="Search title, reference or stage"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(0);
                }}
              />
              {searchTerm && (
                <button type="button" aria-label="Clear submission search" onClick={() => setSearchTerm('')}>
                  <X size={15} />
                </button>
              )}
            </label>
          </div>
          <div className="my-submissions-table-wrap">
            <table className="my-submissions-table" aria-label="Brief submissions">
              <thead>
                <tr><th>Submission</th><th>Category</th><th>Current stage</th><th>Received</th><th>Last updated</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}><LoadingSkeleton label="Loading your submissions…" variant="table" className="my-submissions-table-state" /></td></tr>
                ) : visibleSubmissions.length ? visibleSubmissions.map((item) => {
                  const waitingOnYou = item.stage === 'REFINEMENT_REQUESTED';
                  const stageClass = item.stage.toLowerCase().replaceAll('_', '-');
                  return (
                    <tr key={item.id}>
                      <td data-label="Submission">
                        <Link className="case-title" to={`/submissions/${item.id}`}>
                          <b>{item.title}</b>
                          <small>{item.code || 'Draft · no reference yet'}</small>
                        </Link>
                        {waitingOnYou && <Link to={`/submissions/${item.id}/respond`} className="decision-badge decision-changes_needed my-submissions-response">Waiting on you — respond</Link>}
                      </td>
                      <td data-label="Category"><span className="my-submissions-category">{item.category === 'student' ? 'Student project' : 'General innovation'}</span></td>
                      <td data-label="Current stage"><span className={`my-submissions-stage my-submissions-stage--${stageClass}`}>{formatStage(item.stage)}</span></td>
                      <td data-label="Received">{item.receivedAt ? formatDate(item.receivedAt) : 'Not received'}</td>
                      <td data-label="Last updated">{formatDate(item.updatedAt)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="my-submissions-table-state my-submissions-empty-state">
                        <span className="my-submissions-empty-icon"><Inbox size={22} /></span>
                        <h3>{normalizedSearch ? 'No matching submissions' : 'No submissions yet'}</h3>
                        <p>{normalizedSearch
                          ? 'Try another title, reference or stage, or clear your search.'
                          : 'Your submitted briefs will appear here with their latest status and activity.'}</p>
                        {normalizedSearch
                          ? <button className="my-submissions-clear-search" type="button" onClick={() => setSearchTerm('')}>Clear search</button>
                          : <Link className="my-submissions-empty-action" to="/submissions/new">Register a submission <span aria-hidden="true">→</span></Link>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="my-submissions-pagination">
              <span>{normalizedSearch
                ? `${visibleSubmissions.length} matches on this page`
                : `${result.totalElements} ${result.totalElements === 1 ? 'submission' : 'submissions'}`}</span>
              {result.totalPages > 1 && (
                <div>
                  <button type="button" disabled={page <= 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
                  <span>Page {page + 1} of {result.totalPages}</span>
                  <button type="button" disabled={page + 1 >= result.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
                </div>
              )}
            </div>
          )}
      </section>
    </div>
  );
}
