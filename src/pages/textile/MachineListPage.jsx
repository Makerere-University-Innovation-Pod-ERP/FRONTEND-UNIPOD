import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, TriangleAlert, Wrench } from 'lucide-react';
import { MACHINE_UNAVAILABLE_REASON, isMachineBookable } from '@/lib/textile';
import { formatDate } from '@/lib/presentation';
import { useMachines, useMarkWorking } from '@/hooks/useTextile';
import { ErrorBanner, Loading, MachineState, PageHeading } from './shared';
import { useUnauthorizedRedirect } from './helpers';

export function MachineListPage({ token, onUnauthorized }) {
  const machines = useMachines(token);
  const markWorking = useMarkWorking(token);
  const [confirming, setConfirming] = useState(null);
  const [note, setNote] = useState('');
  useUnauthorizedRedirect(onUnauthorized, machines.error, markWorking.error);
  const items = machines.data ?? [];
  const unavailable = items.filter((machine) => !isMachineBookable(machine)).length;

  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE · EQUIPMENT" title="Machine List" intro="Know which machines are available before scheduling an order.">
        <Link className="btn" to="/textile/machines/report"><TriangleAlert size={15} />Report a fault or service</Link>
      </PageHeading>
      <ErrorBanner error={machines.error} fallback="Could not load machines." />
      {unavailable > 0 && <p className="tx-inline-note">{unavailable} machine{unavailable === 1 ? ' is' : 's are'} unavailable. {MACHINE_UNAVAILABLE_REASON}</p>}
      {machines.isLoading ? <Loading label="Loading machines…" /> : (
        <section className="live-panel tx-table-panel">
          <div className="live-table-wrap">
            <table className="live-table">
              <thead><tr><th>Machine</th><th>State</th><th>Note</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {items.map((machine) => (
                  <tr key={machine.id}>
                    <td><b className="tx-strong">{machine.name}</b></td>
                    <td><MachineState state={machine.state} /></td>
                    <td className="tx-wrap">{machine.note || '—'}</td>
                    <td>{formatDate(machine.updatedAt)}</td>
                    <td className="tx-row-actions">
                      {isMachineBookable(machine) && (
                        <Link className="btn tx-ghost" to={`/textile/machines/report?machine=${encodeURIComponent(machine.id)}`}>
                          <TriangleAlert size={13} />Report
                        </Link>
                      )}
                      {!isMachineBookable(machine) && confirming !== machine.id && (
                        <button type="button" className="btn" onClick={() => { setConfirming(machine.id); setNote(''); }}>
                          <Wrench size={13} />Mark working
                        </button>
                      )}
                      {confirming === machine.id && (
                        <form className="tx-min-form" onSubmit={(event) => {
                          event.preventDefault();
                          markWorking.mutateAsync({ id: machine.id, note: note.trim() }).then(() => setConfirming(null)).catch(() => {});
                        }}>
                          <input aria-label={`Repair note for ${machine.name}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Repair / service note" autoFocus />
                          <button type="submit" className="btn btn-primary" disabled={markWorking.isPending}>
                            {markWorking.isPending ? <LoaderCircle size={12} className="spin" /> : 'Confirm'}
                          </button>
                          <button type="button" className="btn" onClick={() => setConfirming(null)}>Cancel</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ErrorBanner error={markWorking.error} fallback="Could not update the machine." />
        </section>
      )}
    </div>
  );
}
