import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, LoaderCircle, Send } from 'lucide-react';
import { useCncJobs, useCncPriceList, useQuoteCncJob } from '@/hooks/useCnc';
import { useTrainingDepartments } from '@/hooks/useTraining';
import { ErrorBanner, Loading, PageHeading, formatDate, formatUgx } from './shared';

const CHECKS = [
  { id: 'fileReadable', label: 'Design file opens and is readable' },
  { id: 'fitsMachineBed', label: 'Fits the machine bed' },
  { id: 'materialAvailable', label: 'Material is available' },
  { id: 'safeToCut', label: 'Safe to cut' },
];
const NO_CHECKS = Object.fromEntries(CHECKS.map((check) => [check.id, false]));

export function DesignCheckPage({ token }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobsQuery = useCncJobs(token);
  const departmentsQuery = useTrainingDepartments(token);
  const cncDepartment = (departmentsQuery.data ?? []).find((d) => /cnc|carpentry/i.test(d.name));
  const pricesQuery = useCncPriceList(token, cncDepartment?.id);
  const quoteJob = useQuoteCncJob(token);

  const [checks, setChecks] = useState(NO_CHECKS);
  const [priceItemId, setPriceItemId] = useState('');
  const [units, setUnits] = useState('1');
  const [extra, setExtra] = useState('0');
  const [customerEmail, setCustomerEmail] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [formError, setFormError] = useState('');

  const waiting = (jobsQuery.data ?? []).filter((job) => job.stage === 'NEW');
  const selectedId = searchParams.get('job') ?? waiting[0]?.id ?? '';
  const job = (jobsQuery.data ?? []).find((item) => item.id === selectedId);
  const prices = pricesQuery.data ?? [];
  const priceItem = prices.find((item) => item.id === priceItemId);
  const amount = (priceItem ? priceItem.priceUgx * (Number(units) || 0) : 0) + (Number(extra) || 0);
  const allChecked = CHECKS.every((check) => checks[check.id]);

  function chooseJob(id) {
    setSearchParams(id ? { job: id } : {});
    setChecks(NO_CHECKS);
    setFormError('');
  }

  async function sendQuote(event) {
    event.preventDefault();
    setFormError('');
    if (!allChecked) {
      setFormError('Every design check must pass before a quote can be sent.');
      return;
    }
    if (!(amount > 0)) {
      setFormError('Choose a price from the price list or enter an amount.');
      return;
    }
    try {
      await quoteJob.mutateAsync({
        id: job.id,
        quote: {
          amount,
          description: `${job.code} · ${job.title}${priceItem ? ` (${priceItem.service} × ${units})` : ''}`,
          ...(customerEmail.trim() ? { customerEmail: customerEmail.trim() } : {}),
          ...(job.specs.customerName ? { customerName: job.specs.customerName } : {}),
          ...(expectedCompletion ? { expectedCompletion } : {}),
          designCheck: checks,
        },
      });
      navigate(`/cnc/jobs/${encodeURIComponent(job.id)}`);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not send the quote.');
    }
  }

  return (
    <div className="live-page page-enter">
      <PageHeading title="Design Check & Quote" intro="Confirm the job can be made, then price it from the CNC price list. Work starts only after payment." />
      <ErrorBanner error={jobsQuery.error || pricesQuery.error} fallback="Could not load jobs for checking." />

      {jobsQuery.isPending ? <Loading label="Loading jobs…" /> : (
        <div className="detail-grid">
          <section className="live-panel tx-table-panel">
            <h3 className="tx-panel-title">Waiting for a design check ({waiting.length})</h3>
            <div className="live-table-wrap">
              <table className="live-table">
                <thead><tr><th>JOB</th><th>CUSTOMER</th><th>NEEDED</th></tr></thead>
                <tbody>
                  {waiting.map((item) => (
                    <tr key={item.id} data-testid={`check-row-${item.id}`} className={item.id === selectedId ? 'selected' : ''} onClick={() => chooseJob(item.id)}>
                      <td><b className="tx-strong">{item.title}</b> <small className="tx-mono">{item.code}</small></td>
                      <td>{item.specs.customerName ?? '—'}</td>
                      <td>{formatDate(item.dateNeeded)}</td>
                    </tr>
                  ))}
                  {waiting.length === 0 && <tr><td colSpan={3} className="live-empty">No jobs are waiting for a design check.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="live-panel">
            {!job ? <p className="live-empty">Choose a job to check.</p> : (
              <form className="tx-form" onSubmit={sendQuote} aria-label={`Design check for ${job.title}`}>
                <h3 className="tx-panel-title">{job.title} <small className="tx-mono">{job.code}</small></h3>
                <div className="ops-modal-facts">
                  <div className="ops-modal-fact"><span><strong>Customer:</strong> {job.specs.customerName ?? '—'} ({job.specs.customerType ?? '—'}) {job.specs.contact ?? ''}</span></div>
                  <div className="ops-modal-fact"><span><strong>Material & size:</strong> {job.specs.material ?? '—'} · {job.specs.size ?? '—'} · quantity {job.quantity}</span></div>
                  <div className="ops-modal-fact"><span><strong>Design:</strong> {job.specs.designLink
                    ? <a href={job.specs.designLink} target="_blank" rel="noreferrer">Open design <ExternalLink size={12} /></a>
                    : 'No design link supplied'}</span></div>
                  {job.specs.notes && <div className="ops-modal-fact"><span><strong>Notes:</strong> {job.specs.notes}</span></div>}
                </div>

                <fieldset className="tx-rules">
                  <legend>Design check</legend>
                  {CHECKS.map((check) => (
                    <label key={check.id} className="tx-check">
                      <input type="checkbox" checked={checks[check.id]} onChange={(event) => setChecks((prev) => ({ ...prev, [check.id]: event.target.checked }))} />
                      {check.label}
                    </label>
                  ))}
                </fieldset>

                <div className="form-grid">
                  <label className="form-field">Price list item
                    <select value={priceItemId} onChange={(event) => setPriceItemId(event.target.value)} disabled={pricesQuery.isPending}>
                      <option value="">{pricesQuery.isPending ? 'Loading prices…' : prices.length ? 'Choose a price' : 'No CNC prices published'}</option>
                      {prices.map((item) => <option key={item.id} value={item.id}>{item.service} · {formatUgx(item.priceUgx)} {item.unit.replace('PER_', 'per ').toLowerCase()}</option>)}
                    </select>
                  </label>
                  <label className="form-field">Units
                    <input type="number" min="1" value={units} onChange={(event) => setUnits(event.target.value)} />
                  </label>
                  <label className="form-field">Extra charge (UGX)
                    <input type="number" min="0" value={extra} onChange={(event) => setExtra(event.target.value)} />
                  </label>
                  <label className="form-field">Expected completion
                    <input type="date" value={expectedCompletion} onChange={(event) => setExpectedCompletion(event.target.value)} />
                  </label>
                  <label className="form-field">Customer email for the invoice
                    <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Leave empty to invoice the person who sent the job" />
                  </label>
                </div>

                <p className="tx-strong">Total quote: {formatUgx(amount)}</p>
                {formError && <p className="tx-field-error" role="alert">{formError}</p>}
                <div className="tx-actions">
                  <Link className="btn btn-outline" to={`/cnc/jobs/${encodeURIComponent(job.id)}`}>Open job</Link>
                  <button type="submit" className="btn btn-primary" disabled={quoteJob.isPending}>
                    {quoteJob.isPending ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}Send quote
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
