import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useFacilities } from '@/hooks/useBookings';
import { useSetFacilityStatus } from '@/hooks/useCnc';
import { isCncFacility } from '@/services/cnc';
import { ErrorBanner, Loading, PageHeading, StatusDot } from './shared';

const STATE = {
  AVAILABLE: { tone: 'positive', label: 'Working' },
  BOOKED: { tone: 'progress', label: 'In use' },
  MAINTENANCE: { tone: 'danger', label: 'Fault reported' },
};

export function MachineListPage({ token }) {
  const facilitiesQuery = useFacilities(token);
  const setStatus = useSetFacilityStatus(token);
  const [confirmId, setConfirmId] = useState(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState(null);

  const machines = (facilitiesQuery.data ?? []).filter(isCncFacility);
  const faulty = machines.filter((machine) => machine.status === 'MAINTENANCE').length;

  async function change(machine, status, message) {
    setActionError(null);
    setNotice('');
    try {
      await setStatus.mutateAsync({ id: machine.id, status });
      setNotice(message);
      setConfirmId(null);
    } catch (reason) {
      setActionError(reason);
    }
  }

  return (
    <div className="live-page page-enter">
      <PageHeading title="Machine List" intro="CNC router, laser cutter, 3D printers and workshop bays. A reported fault blocks bookings until the machine is working again.">
        <Link className="btn btn-outline" to="/cnc/machines/book"><CalendarDays size={15} />Book a machine</Link>
      </PageHeading>
      <ErrorBanner error={facilitiesQuery.error || actionError} fallback="Could not update the machine." />
      {notice && <p className="tx-success">{notice}</p>}

      <section className="live-metrics tx-metrics" aria-label="Machine KPI metrics">
        <article className="live-metric"><p>MACHINES</p><strong>{machines.length}</strong></article>
        <article className="live-metric"><p>WORKING</p><strong>{machines.length - faulty}</strong></article>
        <article className="live-metric"><p>FAULT REPORTED</p><strong>{faulty}</strong></article>
      </section>

      <section className="live-panel tx-table-panel">
        {facilitiesQuery.isPending ? <Loading label="Loading machines…" variant="table" /> : (
          <div className="live-table-wrap">
            <table className="live-table">
              <thead><tr><th>MACHINE</th><th>LOCATION</th><th>SAFETY PASS</th><th>STATE</th><th>ACTION</th></tr></thead>
              <tbody>
                {machines.map((machine) => {
                  const state = STATE[machine.status] ?? { tone: 'neutral', label: machine.status };
                  return (
                    <tr key={machine.id} data-testid={`machine-row-${machine.id}`}>
                      <td><b className="tx-strong">{machine.name}</b></td>
                      <td>{machine.location ?? '—'}</td>
                      <td>{machine.requiresSafetyPass ? 'Required' : 'Not required'}</td>
                      <td><StatusDot tone={state.tone}>{state.label}</StatusDot></td>
                      <td>
                        {machine.status === 'MAINTENANCE' ? (
                          <button type="button" className="btn btn-sm btn-outline" disabled={setStatus.isPending} onClick={() => change(machine, 'AVAILABLE', `${machine.name} is working again.`)}>
                            <CheckCircle2 size={14} />Mark working
                          </button>
                        ) : confirmId === machine.id ? (
                          <div className="tx-actions">
                            <button type="button" className="btn btn-sm btn-primary" disabled={setStatus.isPending} onClick={() => change(machine, 'MAINTENANCE', `Fault reported on ${machine.name}. It cannot be booked until it is working again.`)}>
                              Confirm fault
                            </button>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setConfirmId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button type="button" className="tx-link-button" onClick={() => setConfirmId(machine.id)}>
                            <TriangleAlert size={13} />Report fault
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {machines.length === 0 && !facilitiesQuery.error && (
                  <tr><td colSpan={5} className="live-empty">No CNC & Carpentry machines are registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
