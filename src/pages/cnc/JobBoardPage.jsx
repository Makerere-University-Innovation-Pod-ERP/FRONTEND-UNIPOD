import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCncJobs } from '@/hooks/useCnc';
import { CNC_STAGES } from '@/services/cnc';
import { ErrorBanner, Loading, PageHeading, PaymentBadge, STAGE_LABELS, formatDate } from './shared';

export function JobBoardPage({ token }) {
  const jobsQuery = useCncJobs(token);
  const jobs = jobsQuery.data ?? [];

  return (
    <div className="live-page page-enter">
      <PageHeading title="Job Board" intro="Every CNC & Carpentry job, from new request to collection.">
        <Link className="btn btn-primary" to="/cnc/jobs/new"><Plus size={15} />New job</Link>
      </PageHeading>
      <ErrorBanner error={jobsQuery.error} fallback="Could not load the job board." />

      {jobsQuery.isPending ? <Loading label="Loading jobs…" variant="board" columns={CNC_STAGES.length} /> : (
        <div className="tx-board">
          {CNC_STAGES.map((stage) => {
            const column = jobs.filter((job) => job.stage === stage);
            return (
              <section key={stage} className="tx-column" aria-labelledby={`col-${stage}`} data-testid={`column-${stage}`}>
                <h2 id={`col-${stage}`}>{STAGE_LABELS[stage]} <span>{column.length}</span></h2>
                {column.length === 0 && <p className="tx-column-empty">Nothing here.</p>}
                {column.map((job) => (
                  <Link
                    key={job.id}
                    className="tx-card"
                    to={stage === 'NEW' ? `/cnc/review?job=${encodeURIComponent(job.id)}` : `/cnc/jobs/${encodeURIComponent(job.id)}`}
                  >
                    <b>{job.title}</b>
                    <small className="tx-mono">{job.code}</small>
                    <small>{job.specs.customerName ?? job.customerId} · {job.specs.material ?? '—'}</small>
                    {job.dateNeeded && <small>Needed {formatDate(job.dateNeeded)}</small>}
                    {(stage === 'QUOTED' || stage === 'PAYMENT_GATE') && (
                      <span className="tx-card-tags"><PaymentBadge status={job.invoiceStatus} /></span>
                    )}
                  </Link>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
