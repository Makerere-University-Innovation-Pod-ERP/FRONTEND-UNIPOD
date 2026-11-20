import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, LoaderCircle, Plus, X } from 'lucide-react';
import { useBookings, useCreateBooking, useDecideAllocation, useFacilities, useReturnAllocation } from '@/hooks/useBookings';
import { AllocationStatusBadge, ErrorBanner, Loading } from './shared';

const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY_LOAN_FORM = {
  facilityId: '',
  equipmentName: '',
  borrowerName: '',
  borrowerType: 'Student',
  borrowerContact: '',
  reason: '',
  dateOut: todayIso(),
  dateBack: '',
};

const RETURN_CONDITION_LABELS = { WORKING: 'Working', BEING_REPAIRED: 'Needs repair', DAMAGED: 'Damaged' };

function formatDay(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function isOverdue(loan) {
  return loan.status === 'OUT' && new Date(loan.endsAt) < new Date();
}

export function EquipmentLendingPage({ token }) {
  const bookingsQuery = useBookings(token);
  const facilitiesQuery = useFacilities(token);
  const createBooking = useCreateBooking(token);
  const decideAllocation = useDecideAllocation(token);
  const returnAllocation = useReturnAllocation(token);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LOAN_FORM);
  const [formError, setFormError] = useState('');
  const [declineId, setDeclineId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [returnId, setReturnId] = useState(null);
  const [returnCondition, setReturnCondition] = useState('WORKING');
  const [returnNotes, setReturnNotes] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState(null);

  const loans = (bookingsQuery.data ?? []).filter((booking) => booking.isEquipmentRequest);
  const facilities = facilitiesQuery.data ?? [];
  const bookableFacilities = facilities.filter((facility) => facility.status !== 'MAINTENANCE');

  const outCount = loans.filter((loan) => loan.status === 'OUT').length;
  const pendingCount = loans.filter((loan) => loan.status === 'PENDING').length;
  const overdueCount = loans.filter(isOverdue).length;
  const returnedCount = loans.filter((loan) => loan.status === 'RETURNED').length;

  function onFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function run(action, notice) {
    setActionError(null);
    setActionNotice('');
    try {
      await action();
      setActionNotice(notice);
      return true;
    } catch (reason) {
      setActionError(reason);
      return false;
    }
  }

  async function onSubmitNewLoan(event) {
    event.preventDefault();
    setFormError('');
    if (!form.facilityId || !form.equipmentName.trim() || !form.borrowerName.trim() || !form.dateOut || !form.dateBack) {
      setFormError('Location, equipment, borrower, date out and return date are required.');
      return;
    }
    if (form.dateBack < form.dateOut) {
      setFormError('The return date cannot be before the date out.');
      return;
    }
    try {
      await createBooking.mutateAsync({
        facilityId: form.facilityId,
        requestType: 'EQUIPMENT',
        isEquipmentRequest: true,
        equipmentName: form.equipmentName.trim(),
        purpose: form.reason.trim() || `Equipment loan for ${form.borrowerName.trim()}`,
        purposeDetail: `Borrower: ${form.borrowerName.trim()} (${form.borrowerType})${form.borrowerContact.trim() ? ` · Contact: ${form.borrowerContact.trim()}` : ''}`,
        operator: form.borrowerName.trim(),
        attendees: 1,
        startsAt: new Date(`${form.dateOut}T08:00:00`).toISOString(),
        endsAt: new Date(`${form.dateBack}T18:00:00`).toISOString(),
      });
      setActionNotice('Loan request submitted for manager approval.');
      setForm(EMPTY_LOAN_FORM);
      setShowForm(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not submit the loan request.');
    }
  }

  async function onDecline(event) {
    event.preventDefault();
    if (!declineReason.trim()) return;
    const ok = await run(
      () => decideAllocation.mutateAsync({ id: declineId, decision: 'DECLINED', note: declineReason.trim() }),
      'Loan declined.',
    );
    if (ok) {
      setDeclineId(null);
      setDeclineReason('');
    }
  }

  async function onCompleteReturn(event) {
    event.preventDefault();
    const ok = await run(
      () => returnAllocation.mutateAsync({
        id: returnId,
        returnedAt: new Date().toISOString(),
        condition: returnCondition,
        notes: returnNotes.trim(),
      }),
      'Return recorded.',
    );
    if (ok) {
      setReturnId(null);
      setReturnCondition('WORKING');
      setReturnNotes('');
    }
  }

  const returnLoan = loans.find((loan) => loan.id === returnId);
  const declineLoan = loans.find((loan) => loan.id === declineId);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS · EQUIPMENT</p>
          <h1>Take Equipment Out</h1>
          <p>Equipment stays in the Pod unless a manager approves a loan. Track checkout, conditions and returns.</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-outline" to="/multimedia/equipment"><ArrowLeft size={14} />Equipment register</Link>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Hide request form' : 'Request equipment loan'}
          </button>
        </div>
      </div>

      <ErrorBanner error={bookingsQuery.error || facilitiesQuery.error || actionError} fallback="Could not complete this equipment loan action." />
      {actionNotice && <p className="tx-success">{actionNotice}</p>}

      <section className="live-metrics tx-metrics" aria-label="Equipment lending KPI metrics">
        <article className="live-metric"><p>OUT ON LOAN</p><strong>{outCount}</strong></article>
        <article className="live-metric"><p>PENDING APPROVAL</p><strong>{pendingCount}</strong></article>
        <article className="live-metric"><p>OVERDUE RETURNS</p><strong>{overdueCount}</strong></article>
        <article className="live-metric"><p>RETURNED</p><strong>{returnedCount}</strong></article>
      </section>

      {returnLoan && (
        <section className="live-panel tx-narrow" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">Record return: {returnLoan.equipmentName} ({returnLoan.reference})</h3>
          <form className="tx-form" onSubmit={onCompleteReturn}>
            <div className="form-field">
              <label htmlFor="eq-return-condition">Condition on return*</label>
              <select id="eq-return-condition" value={returnCondition} onChange={(event) => setReturnCondition(event.target.value)}>
                {Object.entries(RETURN_CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="eq-return-notes">Condition note</label>
              <textarea id="eq-return-notes" rows={3} value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} placeholder="e.g. All accessories returned, lens cap missing." />
            </div>
            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={returnAllocation.isPending}>
                {returnAllocation.isPending ? <LoaderCircle className="spin" size={15} /> : <CheckCircle size={15} />}Confirm return
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setReturnId(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {declineLoan && (
        <section className="live-panel tx-narrow" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">Decline loan: {declineLoan.equipmentName} ({declineLoan.reference})</h3>
          <form className="tx-form" onSubmit={onDecline}>
            <div className="form-field">
              <label htmlFor="eq-decline-reason">Reason*</label>
              <textarea id="eq-decline-reason" required rows={2} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} />
            </div>
            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={!declineReason.trim() || decideAllocation.isPending}>Decline loan</button>
              <button type="button" className="btn btn-outline" onClick={() => setDeclineId(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {showForm && (
        <section className="live-panel" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">Request equipment loan</h3>
          <form className="tx-form" onSubmit={onSubmitNewLoan}>
            <div className="form-grid">
              <label className="form-field">Kept at (studio / facility)*
                <select required value={form.facilityId} onChange={onFormChange('facilityId')}>
                  <option value="" disabled>{facilitiesQuery.isPending ? 'Loading…' : 'Choose where the item is kept'}</option>
                  {bookableFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                </select>
              </label>
              <label className="form-field">Equipment*
                <input required value={form.equipmentName} onChange={onFormChange('equipmentName')} placeholder="e.g. Canon R6 camera kit" />
              </label>
              <label className="form-field">Borrower type
                <select value={form.borrowerType} onChange={onFormChange('borrowerType')}>
                  <option value="Student">Student</option>
                  <option value="Multimedia staff">Multimedia staff</option>
                  <option value="Partner organisation">Partner organisation</option>
                </select>
              </label>
              <label className="form-field">Borrower name*
                <input required value={form.borrowerName} onChange={onFormChange('borrowerName')} placeholder="e.g. Kato Ivan (22/U/1042)" />
              </label>
              <label className="form-field">Contact
                <input value={form.borrowerContact} onChange={onFormChange('borrowerContact')} placeholder="0772-XXXXXX or name@mak.ac.ug" />
              </label>
              <label className="form-field">Reason
                <input value={form.reason} onChange={onFormChange('reason')} placeholder="e.g. Event coverage at Main Hall" />
              </label>
              <label className="form-field">Date out*
                <input type="date" required min={todayIso()} value={form.dateOut} onChange={onFormChange('dateOut')} />
              </label>
              <label className="form-field">Expected return date*
                <input type="date" required min={form.dateOut || todayIso()} value={form.dateBack} onChange={onFormChange('dateBack')} />
              </label>
            </div>
            {formError && <p className="tx-field-error" role="alert">{formError}</p>}
            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={createBooking.isPending}>
                {createBooking.isPending ? <LoaderCircle className="spin" size={15} /> : null}Submit for approval
              </button>
              <button type="button" className="btn btn-outline" onClick={() => { setForm(EMPTY_LOAN_FORM); setShowForm(false); }}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="live-panel tx-table-panel">
        <h3 className="tx-panel-title">Active & historical loans</h3>
        {bookingsQuery.isPending ? (
          <Loading label="Loading equipment loans…" />
        ) : (
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr>
                  <th>LOAN REF</th>
                  <th>EQUIPMENT</th>
                  <th>BORROWER</th>
                  <th>LOAN PERIOD</th>
                  <th>CONDITION</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const overdue = isOverdue(loan);
                  return (
                    <tr key={loan.id} data-testid={`loan-row-${loan.id}`} className={overdue ? 'tx-attention' : ''}>
                      <td className="tx-mono">{loan.reference}</td>
                      <td><b className="tx-strong">{loan.equipmentName || '—'}</b> <small>{loan.facilityName}</small></td>
                      <td>{loan.operator || '—'}{loan.purposeDetail ? <small> {loan.purposeDetail}</small> : null}</td>
                      <td>{formatDay(loan.startsAt)} → {formatDay(loan.endsAt)}</td>
                      <td>
                        {loan.conditionOut ? `Out: ${RETURN_CONDITION_LABELS[loan.conditionOut] ?? loan.conditionOut}` : '—'}
                        {loan.conditionReturned ? ` · Back: ${RETURN_CONDITION_LABELS[loan.conditionReturned] ?? loan.conditionReturned}` : ''}
                      </td>
                      <td><AllocationStatusBadge status={loan.status} overdue={overdue} /></td>
                      <td>
                        {loan.status === 'PENDING' && (
                          <div className="tx-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={decideAllocation.isPending}
                              onClick={() => run(() => decideAllocation.mutateAsync({ id: loan.id, decision: 'APPROVED', note: 'Approved for checkout.' }), `Loan ${loan.reference} approved — item is now out.`)}
                            >
                              <Check size={14} />Approve
                            </button>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => { setDeclineId(loan.id); setDeclineReason(''); }}><X size={14} />Decline</button>
                          </div>
                        )}
                        {loan.status === 'OUT' && (
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => setReturnId(loan.id)}><CheckCircle size={14} />Mark returned</button>
                        )}
                        {loan.status === 'REJECTED' && <span className="live-note">{loan.rejectionReason || 'Declined'}</span>}
                        {loan.status === 'RETURNED' && <span className="live-note">Closed</span>}
                      </td>
                    </tr>
                  );
                })}
                {loans.length === 0 && !bookingsQuery.error && (
                  <tr><td colSpan={7} className="live-empty">No loan records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
