import { useState } from 'react';
import { Ban, CheckCircle2, FileSignature, Play, Plus, Trash2, X } from 'lucide-react';
import { useContracts, useCreateContract, useTransitionContract } from '@/hooks/useContracts';
import { CONTRACT_TRANSITIONS } from '@/services/contracts';
import { ContractStatusBadge, ErrorBanner, Loading } from './shared';

const EMPTY_MILESTONE = { label: '', date: '', amount: '' };
const EMPTY_FORM = { client: '', eventName: '', eventDate: '', venue: '', agreedPrice: '', assignedStaff: '', milestones: [] };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRANSITION_BUTTON = {
  SIGNED: { label: 'Mark signed', icon: FileSignature, className: 'btn-primary' },
  IN_PROGRESS: { label: 'Start coverage', icon: Play, className: 'btn-primary' },
  COMPLETED: { label: 'Mark completed', icon: CheckCircle2, className: 'btn-primary' },
  CANCELLED: { label: 'Cancel contract', icon: Ban, className: 'btn-outline' },
};

function formatMoney(amount, currency = 'UGX') {
  return `${currency} ${Number(amount ?? 0).toLocaleString('en-US')}`;
}

function milestoneText(milestone) {
  if (typeof milestone === 'string') return milestone;
  return [milestone.label, milestone.date, milestone.amount ? formatMoney(milestone.amount) : null].filter(Boolean).join(' · ');
}

export function ContractsPage({ token }) {
  const contractsQuery = useContracts(token);
  const createContract = useCreateContract(token);
  const transitionContract = useTransitionContract(token);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [documentId, setDocumentId] = useState('');
  const [dialogError, setDialogError] = useState('');

  const contracts = contractsQuery.data ?? [];
  const selected = contracts.find((contract) => contract.id === selectedId) ?? null;

  function set(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function setMilestone(index, field) {
    return (event) => setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => (i === index ? { ...m, [field]: event.target.value } : m)),
    }));
  }

  async function onSubmitCreate(event) {
    event.preventDefault();
    setFormError('');
    const agreedPrice = Number(form.agreedPrice);
    if (!form.client.trim() || !form.eventName.trim() || !form.eventDate) {
      setFormError('Client, event and event date are required.');
      return;
    }
    if (!(agreedPrice > 0)) {
      setFormError('The agreed price must be more than zero.');
      return;
    }
    const milestones = form.milestones
      .filter((m) => m.label.trim() || m.date)
      .map((m) => ({ label: m.label.trim() || 'Payment', date: m.date, ...(m.amount ? { amount: Number(m.amount) } : {}) }));
    if (milestones.some((m) => !m.date)) {
      setFormError('Every payment milestone needs a date.');
      return;
    }
    try {
      await createContract.mutateAsync({
        client: form.client.trim(),
        eventName: form.eventName.trim(),
        eventDate: form.eventDate,
        venue: form.venue.trim(),
        agreedPrice,
        milestones,
        assignedStaff: form.assignedStaff.split(',').map((name) => name.trim()).filter(Boolean),
      });
      setForm(EMPTY_FORM);
      setShowCreateForm(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not create the contract.');
    }
  }

  function openContract(contract) {
    setSelectedId(contract.id);
    setDocumentId(contract.signedContractDocId ?? '');
    setDialogError('');
  }

  async function moveTo(status) {
    if (!selected) return;
    setDialogError('');
    const docId = documentId.trim();
    if (status === 'SIGNED' && !selected.signedContractDocId && !UUID_PATTERN.test(docId)) {
      setDialogError('Enter the ID of the uploaded signed contract document before marking it signed.');
      return;
    }
    try {
      await transitionContract.mutateAsync({
        id: selected.id,
        status,
        signedContractDocId: status === 'SIGNED' && docId !== selected.signedContractDocId ? docId : undefined,
      });
    } catch (reason) {
      setDialogError(reason instanceof Error ? reason.message : 'Could not update this contract.');
    }
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS · MULTIMEDIA</p>
          <h1>Event-Coverage Contracts</h1>
          <p>Client, event, agreed price, payment dates and signed paperwork for contracted event coverage.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? <X size={15} /> : <Plus size={15} />}
            {showCreateForm ? 'Cancel' : 'New contract'}
          </button>
        </div>
      </div>

      <ErrorBanner error={contractsQuery.error} fallback="Could not load contracts." />

      {showCreateForm && (
        <section className="live-panel" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">New event-coverage contract</h3>
          <form className="tx-form" onSubmit={onSubmitCreate}>
            <div className="form-grid">
              <label className="form-field">Client*
                <input required value={form.client} onChange={set('client')} />
              </label>
              <label className="form-field">Event*
                <input required value={form.eventName} onChange={set('eventName')} />
              </label>
              <label className="form-field">Event date*
                <input type="date" required value={form.eventDate} onChange={set('eventDate')} />
              </label>
              <label className="form-field">Place
                <input value={form.venue} onChange={set('venue')} />
              </label>
              <label className="form-field">Agreed price (UGX)*
                <input type="number" min="1" required value={form.agreedPrice} onChange={set('agreedPrice')} />
              </label>
              <label className="form-field">Assigned staff (comma separated)
                <input value={form.assignedStaff} onChange={set('assignedStaff')} placeholder="e.g. Katia Birungi, Daniel Kato" />
              </label>
            </div>

            <div className="tx-field form-field">
              <span className="tx-label">Payment dates</span>
              {form.milestones.map((milestone, index) => (
                <div key={index} className="form-grid" data-testid={`milestone-${index}`}>
                  <label className="form-field">Label
                    <input value={milestone.label} onChange={setMilestone(index, 'label')} placeholder="e.g. Deposit" />
                  </label>
                  <label className="form-field">Due date
                    <input type="date" value={milestone.date} onChange={setMilestone(index, 'date')} />
                  </label>
                  <label className="form-field">Amount (UGX, optional)
                    <input type="number" min="1" value={milestone.amount} onChange={setMilestone(index, 'amount')} />
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    aria-label={`Remove payment ${index + 1}`}
                    onClick={() => setForm((prev) => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== index) }))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setForm((prev) => ({ ...prev, milestones: [...prev.milestones, EMPTY_MILESTONE] }))}
              >
                <Plus size={14} />Add payment date
              </button>
            </div>

            {formError && <p className="tx-field-error" role="alert">{formError}</p>}
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
                  <th>CODE</th>
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
                    <td className="tx-mono">{contract.code}</td>
                    <td><b className="tx-strong">{contract.client}</b></td>
                    <td>{contract.eventName}</td>
                    <td className="tx-mono">{contract.eventDate}</td>
                    <td className="tx-mono">{formatMoney(contract.agreedPrice, contract.currency)}</td>
                    <td><ContractStatusBadge status={contract.status} /></td>
                  </tr>
                ))}
                {contracts.length === 0 && !contractsQuery.error && (
                  <tr><td colSpan={6} className="live-empty">No event-coverage contracts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Event-Coverage Contract · {selected.code}</span>
                <h3>{selected.eventName}</h3>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><span><strong>Client:</strong> {selected.client}</span></div>
              <div className="ops-modal-fact"><span><strong>Date & place:</strong> {selected.eventDate} · {selected.venue || '—'}</span></div>
              <div className="ops-modal-fact"><span><strong>Agreed price:</strong> {formatMoney(selected.agreedPrice, selected.currency)}</span></div>
              <div className="ops-modal-fact"><span><strong>Payment dates:</strong> {selected.milestonePaymentDates.length ? selected.milestonePaymentDates.map(milestoneText).join('; ') : '—'}</span></div>
              <div className="ops-modal-fact"><span><strong>Assigned staff:</strong> {selected.assignedStaff.length ? selected.assignedStaff.join(', ') : '—'}</span></div>
              <div className="ops-modal-fact"><span><strong>Signed paperwork:</strong> {selected.signedContractDocId ? 'On file' : 'Not attached yet'}</span></div>
              <div className="ops-modal-fact"><span><strong>Invoices raised:</strong> {selected.invoiceIds.length}</span></div>
              <div className="ops-modal-fact"><span><strong>Status:</strong> <ContractStatusBadge status={selected.status} /></span></div>
            </div>

            {selected.status === 'DRAFT' && !selected.signedContractDocId && (
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="contract-document-id">Signed contract document ID</label>
                <input
                  id="contract-document-id"
                  value={documentId}
                  onChange={(event) => setDocumentId(event.target.value)}
                  placeholder="ID of the uploaded signed contract"
                />
                <small className="live-note">The backend requires an uploaded signed contract before the contract can be marked signed.</small>
              </div>
            )}

            {dialogError && <p className="tx-field-error" role="alert">{dialogError}</p>}

            <div className="ops-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedId(null)}>Close</button>
              {CONTRACT_TRANSITIONS[selected.status].map((status) => {
                const { label, icon: Icon, className } = TRANSITION_BUTTON[status];
                return (
                  <button key={status} type="button" className={`btn ${className}`} onClick={() => moveTo(status)} disabled={transitionContract.isPending}>
                    <Icon size={14} />{label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
