import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BellRing, LoaderCircle } from 'lucide-react';
import { useEquipmentList, useReportEquipmentFault } from '@/hooks/useEquipment';
import { EquipmentStateBadge, ErrorBanner, Loading } from './shared';

export function ReportFaultPage({ token }) {
  const [searchParams] = useSearchParams();
  const equipmentQuery = useEquipmentList(token);
  const reportFault = useReportEquipmentFault(token);

  const [equipmentId, setEquipmentId] = useState(searchParams.get('equipment') ?? '');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);

  const items = equipmentQuery.data ?? [];
  const selected = items.find((item) => item.id === equipmentId);

  function onSubmit(event) {
    event.preventDefault();
    reportFault.mutateAsync({ equipmentId, description: description.trim() })
      .then((updated) => {
        setResult(updated);
        setDescription('');
      })
      .catch(() => {});
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS · EQUIPMENT</p>
          <h1>Report a Fault</h1>
          <p>Flag broken or faulty Multimedia equipment so it can't be booked out.</p>
        </div>
      </div>

      <ErrorBanner error={equipmentQuery.error} fallback="Could not load equipment." />

      {result && (
        <div className="tx-success tx-success-block" role="status">
          <BellRing size={16} />
          <div>
            <b>Fault reported for {result.name}.</b>
            <p>The item is now <EquipmentStateBadge state={result.state} /> and cannot be loaned until it is cleared.</p>
            <Link to="/multimedia/equipment">View equipment register<ArrowRight size={13} /></Link>
          </div>
        </div>
      )}

      {equipmentQuery.isLoading ? <Loading label="Loading equipment…" /> : (
        <form className="live-panel tx-form tx-narrow" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">Equipment*
              <select required value={equipmentId} onChange={(event) => { setEquipmentId(event.target.value); setResult(null); }}>
                <option value="" disabled>Choose an item</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.assetTag})</option>)}
              </select>
              {selected && <span className="field-note">Currently <EquipmentStateBadge state={selected.state} /></span>}
            </label>
            <label className="form-field">Description*
              <textarea
                required
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is wrong? When did it happen?"
              />
            </label>
          </div>
          <ErrorBanner error={reportFault.error} fallback="Could not send the report." />
          <div className="tx-actions">
            <button type="submit" className="btn btn-primary" disabled={reportFault.isPending || !equipmentId || !description.trim()}>
              {reportFault.isPending ? <LoaderCircle size={15} className="spin" /> : null}Report fault
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
