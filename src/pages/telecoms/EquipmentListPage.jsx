import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useReportTelecomsFault, useTelecomsEquipment } from '@/hooks/useTelecoms';
import { EquipmentStateBadge, ErrorBanner, Loading, PageHeading } from './shared';
import { useUnauthorizedRedirect } from './helpers';

export function EquipmentListPage({ token, onUnauthorized }) {
  const equipmentQuery = useTelecomsEquipment(token);
  const reportFault = useReportTelecomsFault(token);
  const [selectedEqId, setSelectedEqId] = useState(null);
  const [faultDescription, setFaultDescription] = useState('');
  const [faultNotice, setFaultNotice] = useState('');
  useUnauthorizedRedirect(onUnauthorized, equipmentQuery.error, reportFault.error);

  const items = equipmentQuery.data ?? [];
  const selectedItem = items.find((candidate) => candidate.id === selectedEqId);

  const onSubmitFault = async (e) => {
    e.preventDefault();
    if (!selectedEqId || !faultDescription.trim()) return;
    try {
      await reportFault.mutateAsync({
        equipmentId: selectedEqId,
        description: faultDescription.trim(),
      });
      setFaultNotice(`Fault reported for ${selectedItem?.name}. Equipment flagged and managers notified.`);
      setSelectedEqId(null);
      setFaultDescription('');
    } catch {
      // Error handled below
    }
  };

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · WORKFLOW 6.3"
        title="Telecoms Equipment Register"
        intro="Catalog of RF test benches, signal generators, spectrum analyzers, oscilloscopes and soldering rework stations."
      >
        <Link className="btn btn-primary" to="/telecoms/equipment/lending">
          <ArrowLeftRight size={15} />Equipment Lending Desk
        </Link>
      </PageHeading>

      <ErrorBanner error={equipmentQuery.error || reportFault.error} fallback="Could not load equipment." />

      {faultNotice && <p className="tx-success">{faultNotice}</p>}

      {equipmentQuery.isLoading ? (
        <Loading label="Loading equipment list…" />
      ) : (
        <div className="live-table-wrap">
          <table className="live-table">
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Equipment Name</th>
                <th>Available / Total</th>
                <th>State</th>
                <th>Location</th>
                <th>Notes / Service Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((eq) => (
                <tr key={eq.id}>
                  <td className="tx-mono"><b style={{ fontSize: '13px', color: '#0f172a' }}>{eq.assetTag}</b></td>
                  <td><b style={{ fontSize: '14.5px', color: '#0f172a' }}>{eq.name}</b></td>
                  <td>
                    <b style={{ fontSize: '14px', color: '#0f172a' }}>{eq.availableQuantity}</b> <span style={{ color: '#475569', fontSize: '13px' }}>of {eq.totalQuantity} units</span>
                  </td>
                  <td><EquipmentStateBadge state={eq.state} /></td>
                  <td style={{ fontSize: '13.5px', color: '#334155' }}>{eq.location}</td>
                  <td style={{ fontSize: '13px', color: '#475569', maxWidth: '280px', whiteSpace: 'normal' }}>{eq.note || '—'}</td>
                  <td>
                    {eq.state !== 'FAULTY' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: '12.5px', fontWeight: 600, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => { setSelectedEqId(eq.id); setFaultDescription(''); }}
                      >
                        <TriangleAlert size={14} style={{ color: '#b91c1c' }} />Report Fault
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '3px 8px', borderRadius: '4px' }}>
                        Fault Flagged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem && (
        <div className="live-panel" style={{ marginTop: 20 }}>
          <h3 className="tx-panel-title">Report Fault: {selectedItem.name} ({selectedItem.assetTag})</h3>
          <p className="tx-inline-note">
            Per Rule 12, reporting a fault immediately alerts Pod managers and blocks conflicting bookings until repaired.
          </p>
          <form className="tx-form" onSubmit={onSubmitFault}>
            <div className="form-field">
              <label htmlFor="tl-fault-desc">Issue Description *</label>
              <textarea
                id="tl-fault-desc"
                required
                rows={3}
                placeholder="Describe the failure, damage, error code or calibration issue…"
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
              />
            </div>
            <div className="tx-actions">
              <button className="btn btn-primary" type="submit" disabled={reportFault.isPending || !faultDescription.trim()}>
                {reportFault.isPending ? <LoaderCircle className="spin" size={14} /> : <TriangleAlert size={14} />}
                Submit Fault Report
              </button>
              <button type="button" className="btn" onClick={() => setSelectedEqId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
