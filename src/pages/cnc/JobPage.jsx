import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Lock, Plus, Trash2 } from 'lucide-react';
import { useCncJobs, useMoveCncJob } from '@/hooks/useCnc';
import { isPaid } from '@/services/cnc';
import { ErrorBanner, Loading, PageHeading, PaymentBadge, StageBadge, STAGE_LABELS, formatDate, formatUgx } from './shared';

const QUALITY_CHECKS = [
  { id: 'dimensionsCorrect', label: 'Dimensions match the design' },
  { id: 'finishClean', label: 'Edges and finish are clean' },
  { id: 'quantityComplete', label: 'Full quantity made' },
  { id: 'safeToHandle', label: 'Safe to handle (no splinters or sharp edges)' },
];
const EMPTY_MATERIAL = { name: '', qty: '', unit: 'pcs' };

function cleanMaterials(rows) {
  return rows
    .filter((row) => row.name.trim() && Number(row.qty) > 0)
    .map((row) => ({ name: row.name.trim(), qty: Number(row.qty), unit: row.unit.trim() || 'pcs' }));
}

export function JobPage({ token }) {
  const { id } = useParams();
  const jobsQuery = useCncJobs(token);
  const moveJob = useMoveCncJob(token);
  const job = (jobsQuery.data ?? []).find((item) => item.id === id);

  const [materials, setMaterials] = useState([EMPTY_MATERIAL]);
  const [machineTime, setMachineTime] = useState('');
  const [quality, setQuality] = useState(Object.fromEntries(QUALITY_CHECKS.map((c) => [c.id, false])));
  const [collectedBy, setCollectedBy] = useState('');
  const [actionError, setActionError] = useState('');

  async function move(change) {
    setActionError('');
    try {
      await moveJob.mutateAsync({ id: job.id, ...change });
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Could not update the job.');
    }
  }

  function markReady(event) {
    event.preventDefault();
    const used = cleanMaterials(materials);
    if (used.length === 0 || !machineTime.trim()) {
      setActionError('Record the materials used and the machine time before marking the job ready.');
      return;
    }
    if (!QUALITY_CHECKS.every((check) => quality[check.id])) {
      setActionError('Every quality check must pass before the job is ready.');
      return;
    }
    move({ stage: 'READY', materialsUsed: used, machineTimeUsed: machineTime.trim(), qualityChecklist: quality, notes: 'Quality checked and ready for collection.' });
  }

  function recordCollection(event) {
    event.preventDefault();
    if (!collectedBy.trim()) {
      setActionError('Enter the name of the person collecting.');
      return;
    }
    move({
      stage: 'COLLECTED',
      materialsUsed: job.materialsUsed,
      machineTimeUsed: job.machineTimeUsed ?? undefined,
      qualityChecklist: job.qualityChecklist ?? undefined,
      collectionSignature: collectedBy.trim(),
      notes: `Collected by ${collectedBy.trim()}.`,
    });
  }

  if (jobsQuery.isPending) return <div className="live-page"><Loading label="Loading job…" /></div>;
  if (!job) {
    return (
      <div className="live-page page-enter">
        <ErrorBanner error={jobsQuery.error} fallback="Could not load the job." />
        <div className="live-panel not-found-live">
          <p className="eyebrow">CNC & CARPENTRY</p>
          <h1>Job not found.</h1>
          <Link className="btn btn-primary" to="/cnc/board">Back to the job board</Link>
        </div>
      </div>
    );
  }

  const paid = isPaid(job);
  const awaitingPayment = job.stage === 'QUOTED' || job.stage === 'PAYMENT_GATE';

  return (
    <div className="live-page page-enter">
      <PageHeading title={job.title} intro={`${job.code} · created ${formatDate(job.createdAt)}`}>
        <Link className="btn btn-outline" to="/cnc/board"><ArrowLeft size={14} />Job board</Link>
      </PageHeading>

      {actionError && <p className="tx-field-error" role="alert">{actionError}</p>}

      <div className="detail-grid">
        <section className="live-panel">
          <h3 className="tx-panel-title">Job details</h3>
          <div className="ops-modal-facts">
            <div className="ops-modal-fact"><span><strong>Stage:</strong> <StageBadge stage={job.stage} /></span></div>
            <div className="ops-modal-fact"><span><strong>Customer:</strong> {job.specs.customerName ?? job.customerId} ({job.specs.customerType ?? '—'}) {job.specs.contact ?? ''}</span></div>
            <div className="ops-modal-fact"><span><strong>Material & size:</strong> {job.specs.material ?? '—'} · {job.specs.size ?? '—'} · quantity {job.quantity}</span></div>
            <div className="ops-modal-fact"><span><strong>Needed by:</strong> {formatDate(job.dateNeeded)}</span></div>
            <div className="ops-modal-fact"><span><strong>Design:</strong> {job.specs.designLink
              ? <a href={job.specs.designLink} target="_blank" rel="noreferrer">Open design <ExternalLink size={12} /></a>
              : 'No design link supplied'}</span></div>
            {job.specs.notes && <div className="ops-modal-fact"><span><strong>Notes:</strong> {job.specs.notes}</span></div>}
            <div className="ops-modal-fact"><span><strong>Quote:</strong> {job.quote ? `${formatUgx(job.quote.amount)}${job.quote.expectedCompletion ? ` · ready by ${formatDate(job.quote.expectedCompletion)}` : ''}` : 'Not quoted yet'}</span></div>
            <div className="ops-modal-fact"><span><strong>Payment:</strong> <PaymentBadge status={job.invoiceStatus} /></span></div>
            {job.machineTimeUsed && <div className="ops-modal-fact"><span><strong>Machine time:</strong> {job.machineTimeUsed}</span></div>}
            {job.materialsUsed.length > 0 && (
              <div className="ops-modal-fact"><span><strong>Materials used:</strong> {job.materialsUsed.map((m) => `${m.name} × ${m.qty} ${m.unit ?? ''}`.trim()).join(', ')}</span></div>
            )}
            {job.collectionSignature && <div className="ops-modal-fact"><span><strong>Collected by:</strong> {job.collectionSignature}</span></div>}
          </div>
        </section>

        <section className="live-panel">
          <h3 className="tx-panel-title">Next step</h3>

          {job.stage === 'NEW' && (
            <Link className="btn btn-primary" to={`/cnc/review?job=${encodeURIComponent(job.id)}`}>Check design & send quote</Link>
          )}

          {awaitingPayment && (
            <div className="tx-form">
              {!paid && <p className="live-note"><Lock size={13} /> Scheduling unlocks once Finance confirms the payment.</p>}
              <button type="button" className="btn btn-primary" disabled={!paid || moveJob.isPending} onClick={() => move({ stage: 'SCHEDULED', notes: 'Payment confirmed; job scheduled.' })}>
                Schedule job
              </button>
            </div>
          )}

          {job.stage === 'SCHEDULED' && (
            <button type="button" className="btn btn-primary" disabled={moveJob.isPending} onClick={() => move({ stage: 'IN_PRODUCTION', notes: 'Production started.' })}>
              Start production
            </button>
          )}

          {job.stage === 'IN_PRODUCTION' && (
            <form className="tx-form" onSubmit={markReady} aria-label="Record production and quality check">
              <span className="tx-label">Materials used</span>
              {materials.map((row, index) => (
                <div key={index} className="form-grid" data-testid={`material-${index}`}>
                  <label className="form-field">Material
                    <input value={row.name} onChange={(event) => setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, name: event.target.value } : m)))} />
                  </label>
                  <label className="form-field">Quantity
                    <input type="number" min="1" value={row.qty} onChange={(event) => setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, qty: event.target.value } : m)))} />
                  </label>
                  <label className="form-field">Unit
                    <input value={row.unit} onChange={(event) => setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, unit: event.target.value } : m)))} />
                  </label>
                  {materials.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline" aria-label={`Remove material ${index + 1}`} onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setMaterials((prev) => [...prev, EMPTY_MATERIAL])}><Plus size={14} />Add material</button>
              <label className="form-field">Machine time used
                <input value={machineTime} onChange={(event) => setMachineTime(event.target.value)} placeholder="e.g. CNC router 2 h 30 min" />
              </label>
              <fieldset className="tx-rules">
                <legend>Quality check</legend>
                {QUALITY_CHECKS.map((check) => (
                  <label key={check.id} className="tx-check">
                    <input type="checkbox" checked={quality[check.id]} onChange={(event) => setQuality((prev) => ({ ...prev, [check.id]: event.target.checked }))} />
                    {check.label}
                  </label>
                ))}
              </fieldset>
              <button type="submit" className="btn btn-primary" disabled={moveJob.isPending}>Mark checked & ready</button>
            </form>
          )}

          {job.stage === 'READY' && (
            <form className="tx-form" onSubmit={recordCollection} aria-label="Record collection">
              <label className="form-field">Collected by
                <input value={collectedBy} onChange={(event) => setCollectedBy(event.target.value)} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={moveJob.isPending}>Record collection</button>
            </form>
          )}

          {job.stage === 'COLLECTED' && <p className="tx-success">This job is complete.</p>}

          <h3 className="tx-panel-title">History</h3>
          <ul className="ops-roster" aria-label="Job history">
            {[...job.stageHistory].reverse().map((entry, index) => (
              <li key={index} className="ops-roster-row">
                <div>
                  <strong>{STAGE_LABELS[entry.stage] ?? entry.stage}</strong>
                  <small>{entry.notes ?? ''}</small>
                </div>
                <small>{formatDate(entry.at)} · {entry.by}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
