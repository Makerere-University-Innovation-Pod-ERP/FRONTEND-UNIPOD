import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BellRing, LoaderCircle, Lock } from 'lucide-react';
import { useMachines, useReportFault } from '@/hooks/useTextile';
import { ErrorBanner, Loading, MachineState, PageHeading, PhotoDrop } from './shared';
import { useUnauthorizedRedirect } from './helpers';

export function ReportFaultPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const machines = useMachines(token);
  const report = useReportFault(token);
  useUnauthorizedRedirect(onUnauthorized, machines.error, report.error);

  const [machineId, setMachineId] = useState(searchParams.get('machine') ?? '');
  const [kind, setKind] = useState('FAULT');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const selected = (machines.data ?? []).find((machine) => machine.id === machineId);

  const onSubmit = (event) => {
    event.preventDefault();
    report.mutateAsync({ machineId, report: { kind, description: description.trim() }, photo })
      .then((response) => {
        setResult(response);
        setDescription('');
        setPhoto(null);
      })
      .catch(() => {});
  };

  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE · EQUIPMENT" title="Report a Fault or Service" intro="Tell the managers something is broken or due for service." />
      <ErrorBanner error={machines.error} fallback="Could not load machines." />
      {result && (
        <div className="tx-success tx-success-block" role="status">
          <BellRing size={16} />
          <div>
            <b>{result.report.kind === 'SERVICE' ? 'Service request' : 'Fault'} reported for {result.machine.name}.</b>
            <p>Managers notified: {result.managersNotified.join(', ')}. The machine is now <MachineState state={result.machine.state} /> and cannot be booked until it is marked Working.</p>
            <Link to="/textile/machines">View machine list<ArrowRight size={13} /></Link>
          </div>
        </div>
      )}
      {machines.isLoading ? <Loading label="Loading machines…" /> : (
        <form className="live-panel tx-form tx-narrow" onSubmit={onSubmit}>
          <div className="tx-segments" role="radiogroup" aria-label="Report type">
            {[['FAULT', 'Fault'], ['SERVICE', 'Service due']].map(([value, label]) => (
              <label key={value} className={`tx-segment ${kind === value ? 'selected' : ''}`}>
                <input type="radio" name="report-kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                <i aria-hidden="true" />{label}
              </label>
            ))}
          </div>
          <div className="form-grid">
            <label className="form-field">Machine*
              <select required value={machineId} onChange={(event) => { setMachineId(event.target.value); setResult(null); }}>
                <option value="" disabled>Choose a machine</option>
                {(machines.data ?? []).map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
              </select>
              {selected && <span className="field-note">Currently <MachineState state={selected.state} />{selected.note ? ` · ${selected.note}` : ''}</span>}
            </label>
            <label className="form-field">Description*
              <textarea required rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)}
                placeholder={kind === 'SERVICE' ? 'What service is due and when?' : 'What is wrong? When does it happen?'} />
            </label>
          </div>
          <PhotoDrop label="Optional photo" hint="JPG, PNG up to 15 MB" file={photo} onChange={setPhoto} />
          <ErrorBanner error={report.error} fallback="Could not send the report." />
          <div className="tx-actions">
            <button type="submit" className="btn btn-primary" disabled={report.isPending || !machineId || !description.trim()}>
              {report.isPending ? <LoaderCircle size={15} className="spin" /> : null}Report
            </button>
          </div>
          <p className="tx-lock-note"><Lock size={12} />Managers are notified immediately. The machine cannot be booked again until it is marked Working.</p>
        </form>
      )}
    </div>
  );
}
