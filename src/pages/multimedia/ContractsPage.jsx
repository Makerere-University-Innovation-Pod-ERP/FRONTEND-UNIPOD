import { useState } from 'react';
import { CheckCircle2, FileSignature, Plus, X } from 'lucide-react';
import { useContracts, useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { ContractStatusBadge, ErrorBanner, Loading } from './shared';

const EMPTY_FORM = { client: '', event: '', date: '', place: '', agreedPriceUgx: '', paymentDueDate: '' };

function formatUgx(amount) {
  return `UGX ${Number(amount ?? 0).toLocaleString('en-US')}`;
}

export function ContractsPage({ token }) {
  const contractsQuery = useContracts(token);
  const createContract = useCreateContract(token);
  const updateContract = useUpdateContract(token);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [paperworkReference, setPaperworkReference] = useState('');

  const contracts = contractsQuery.data ?? [];

  function set(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function onSubmitCreate(event) {
    event.preventDefault();
    if (!form.client.trim() || !form.event.trim() || !form.date || !form.place.trim()) return;
    try {
      await createContract.mutateAsync({
        ...form,
        agreedPriceUgx: Number(form.agreedPriceUgx) || 0,
        paymentDueDate: form.paymentDueDate || null,
      });
      setForm(EMPTY_FORM);
      setShowCreateForm(false);
    } catch {
      // ErrorBanner below surfaces createContract.error
    }
  }

  function openContract(contract) {
    setSelected(contract);
    setPaperworkReference(contract.signedPaperworkReference ?? '');
  }

  async function markSigned() {
    if (!selected) return;
    const updated = await updateContract.mutateAsync({
      id: selected.id,
      status: 'SIGNED',
      signedPaperworkReference: paperworkReference.trim() || null,
    });
    setSelected(updated);
  }

  async function markCompleted() {
    if (!selected) return;
    const updated = await updateContract.mutateAsync({ id: selected.id, status: 'COMPLETED' });
    setSelected(updated);
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS · MULTIMEDIA</p>
          <h1>Event-Coverage Contracts</h1>
          <p>Client, event, agreed price and signed paperwork for contracted event coverage.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? <X size={15} /> : <Plus size={15} />}
            {showCreateForm ? 'Cancel' : 'New contract'}
          </button>
        </div>
      </div>

      <ErrorBanner error={contractsQuery.error || createContract.error} fallback="Could not load contracts." />

      {showCreateForm && (
        <section className="live-panel" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">New event-coverage contract</h3>
          <form className="tx-form" onSubmit={onSubmitCreate}>
            <div className="form-grid">
              <label className="form-field">Client*
                <input required value={form.client} onChange={set('client')} />
              </label>
              <label className="form-field">Event*
                <input required value={form.event} onChange={set('event')} />
              </label>
              <label className="form-field">Event date*
                <input type="date" required value={form.date} onChange={set('date')} />
              </label>
              <label className="form-field">Place*
                <input required value={form.place} onChange={set('place')} />
              </label>
              <label className="form-field">Agreed price (UGX)*
                <input type="number" min="0" required value={form.agreedPriceUgx} onChange={set('agreedPriceUgx')} />
              </label>
              <label className="form-field">Payment due date
                <input type="date" value={form.paymentDueDate} onChange={set('paymentDueDate')} />
              </label>
            </div>
            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={createContract.isPending}>
                {createContract.isPending ? 'Creating…' : 'Create contract'}
              </button>
            </div>
          </form>
        </section>
      )}

      {contractsQuery.isLoading ? (
        <Loading label="Loading contracts…" />
      ) : (
        <section className="live-panel tx-table-panel">
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr>
                  <th>CLIENT</th>
                  <th>EVENT</th>
                  <th>DATE</th>
                  <th>AGREED PRICE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} data-testid={`contract-row-${contract.id}`} onClick={() => openContract(contract)}>
                    <td><b className="tx-strong">{contract.client}</b></td>
                    <td>{contract.event}</td>
                    <td>{contract.date}</td>
                    <td className="tx-mono">{formatUgx(contract.agreedPriceUgx)}</td>
                    <td><ContractStatusBadge status={contract.status} /></td>
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr><td colSpan={5} className="live-empty">No event-coverage contracts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelected(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Event-Coverage Contract</span>
                <h3>{selected.event}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><span><strong>Client:</strong> {selected.client}</span></div>
              <div className="ops-modal-fact"><span><strong>Date & place:</strong> {selected.date} · {selected.place}</span></div>
              <div className="ops-modal-fact"><span><strong>Agreed price:</strong> {formatUgx(selected.agreedPriceUgx)}</span></div>
              <div className="ops-modal-fact"><span><strong>Payment due:</strong> {selected.paymentDueDate ?? '—'}</span></div>
              <div className="ops-modal-fact"><span><strong>Status:</strong> <ContractStatusBadge status={selected.status} /></span></div>
            </div>

            {selected.status !== 'COMPLETED' && (
              <div className="tx-field">
                <label className="tx-label" htmlFor="contract-paperwork-ref">Signed paperwork reference</label>
                <input
                  id="contract-paperwork-ref"
                  value={paperworkReference}
                  onChange={(event) => setPaperworkReference(event.target.value)}
                  placeholder="e.g. MOU-CT-2026-015"
                />
              </div>
            )}

            <ErrorBanner error={updateContract.error} fallback="Could not update this contract." />

            <div className="ops-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'DRAFT' && (
                <button type="button" className="btn btn-primary" onClick={markSigned} disabled={updateContract.isPending}>
                  <FileSignature size={14} />Mark signed
                </button>
              )}
              {selected.status === 'SIGNED' && (
                <button type="button" className="btn btn-primary" onClick={markCompleted} disabled={updateContract.isPending}>
                  <CheckCircle2 size={14} />Mark completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
