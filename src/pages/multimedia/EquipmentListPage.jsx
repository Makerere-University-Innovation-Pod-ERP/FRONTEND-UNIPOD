import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useEquipmentList, useMarkEquipmentWorking } from '@/hooks/useEquipment';
import { EquipmentStateBadge, ErrorBanner, Loading } from './shared';

export function EquipmentListPage({ token }) {
  const [searchParams] = useSearchParams();
  const linkedEquipmentId = searchParams.get('equipment');
  const equipmentQuery = useEquipmentList(token);
  const markWorking = useMarkEquipmentWorking(token);
  const items = equipmentQuery.data ?? [];

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Equipment Register</h1>
          <p>Cameras, audio, lighting and support gear available for Multimedia bookings.</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-primary" to="/multimedia/equipment/lending">
            <ArrowLeftRight size={15} />Take equipment out
          </Link>
        </div>
      </div>

      <ErrorBanner error={equipmentQuery.error || markWorking.error} fallback="Could not load or update equipment." />

      {equipmentQuery.isLoading ? (
        <Loading label="Loading equipment…" />
      ) : (
        <section className="live-panel tx-table-panel">
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr>
                  <th>ASSET TAG</th>
                  <th>EQUIPMENT</th>
                  <th>AVAILABLE / TOTAL</th>
                  <th>STATE</th>
                  <th>LOCATION</th>
                  <th>NOTE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    data-notification-target={item.id === linkedEquipmentId ? 'true' : undefined}
                    style={item.id === linkedEquipmentId ? { background: '#fff8e6', outline: '2px solid #d59b3d', outlineOffset: '-2px' } : undefined}
                  >
                    <td className="tx-mono">{item.assetTag}</td>
                    <td><b className="tx-strong">{item.name}</b></td>
                    <td>{item.availableQuantity} of {item.totalQuantity}</td>
                    <td><EquipmentStateBadge state={item.state} /></td>
                    <td>{item.location}</td>
                    <td className="tx-wrap">{item.note || '—'}</td>
                    <td>
                      {item.state === 'FAULTY' ? (
                        <div>
                          <span className="tx-status tx-danger"><i aria-hidden="true" />Fault reported</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={markWorking.isPending}
                            onClick={() => markWorking.mutate(item.id)}
                          >
                            <CheckCircle2 size={13} />Mark working
                          </button>
                        </div>
                      ) : (
                        <Link className="tx-link-button" to={`/multimedia/equipment/report-fault?equipment=${encodeURIComponent(item.id)}`}>
                          <TriangleAlert size={13} />Report fault
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="live-empty">No equipment registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
