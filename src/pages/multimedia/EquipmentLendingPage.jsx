import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, LoaderCircle, Plus, X } from 'lucide-react';
import { isLoanOverdue, todayIso } from '@/lib/equipment';
import {
  useApproveEquipmentLoan,
  useDeclineEquipmentLoan,
  useEquipmentList,
  useEquipmentLoans,
  useRequestEquipmentLoan,
  useReturnEquipmentLoan,
} from '@/hooks/useEquipment';
import { ErrorBanner, Loading, LoanStatusBadge } from './shared';

const EMPTY_LOAN_FORM = {
  equipmentId: '',
  quantity: 1,
  borrowerName: '',
  borrowerType: 'Student',
  borrowerContact: '',
  dateOut: todayIso(),
  dateBack: '',
  outgoingCondition: 'Clean and fully charged with all accessories included.',
};

export function EquipmentLendingPage({ token }) {
  const loansQuery = useEquipmentLoans(token);
  const equipmentQuery = useEquipmentList(token);

  const requestLoan = useRequestEquipmentLoan(token);
  const approveLoan = useApproveEquipmentLoan(token);
  const declineLoan = useDeclineEquipmentLoan(token);
  const returnLoan = useReturnEquipmentLoan(token);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LOAN_FORM);
  const [returnDialogId, setReturnDialogId] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Returned in working condition.');
  const [actionNotice, setActionNotice] = useState('');

  const loans = loansQuery.data ?? [];
  const equipmentList = equipmentQuery.data ?? [];
  const availableEquipment = equipmentList.filter((eq) => eq.availableQuantity > 0 && eq.state !== 'FAULTY');

  const activeCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const pendingCount = loans.filter((l) => l.status === 'PENDING_APPROVAL').length;
  const overdueCount = loans.filter((l) => isLoanOverdue(l)).length;

  function onFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function onSubmitNewLoan(event) {
    event.preventDefault();
    if (!form.equipmentId || !form.borrowerName.trim() || !form.dateBack) return;
    try {
      await requestLoan.mutateAsync({ ...form, quantity: Number(form.quantity) || 1 });
      setActionNotice('Loan request submitted for manager approval.');
      setForm(EMPTY_LOAN_FORM);
      setShowForm(false);
    } catch {
      // ErrorBanner below surfaces requestLoan.error
    }
  }

  async function onApprove(loanId) {
    try {
      await approveLoan.mutateAsync({ loanId, note: 'Approved for checkout.' });
      setActionNotice(`Loan ${loanId} approved.`);
    } catch {
      // ErrorBanner below surfaces approveLoan.error
    }
  }

  async function onDecline(loanId) {
    try {
      await declineLoan.mutateAsync({ loanId, reason: 'Declined: equipment needed in studio.' });
      setActionNotice(`Loan ${loanId} declined.`);
    } catch {
      // ErrorBanner below surfaces declineLoan.error
    }
  }

  async function onCompleteReturn(event) {
    event.preventDefault();
    if (!returnDialogId) return;
    try {
      await returnLoan.mutateAsync({ loanId: returnDialogId, condition: returnCondition });
      setActionNotice(`Loan ${returnDialogId} marked returned.`);
      setReturnDialogId(null);
    } catch {
      // ErrorBanner below surfaces returnLoan.error
    }
  }

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

      <ErrorBanner
        error={loansQuery.error || equipmentQuery.error || requestLoan.error || approveLoan.error || declineLoan.error || returnLoan.error}
        fallback="Could not complete this equipment loan action."
      />
      {actionNotice && <p className="tx-success">{actionNotice}</p>}

      <section className="live-metrics tx-metrics" aria-label="Equipment lending KPI metrics">
        <article className="live-metric"><p>ACTIVE ON LOAN</p><strong>{activeCount}</strong></article>
        <article className="live-metric"><p>PENDING APPROVAL</p><strong>{pendingCount}</strong></article>
        <article className="live-metric"><p>OVERDUE RETURNS</p><strong>{overdueCount}</strong></article>
        <article className="live-metric"><p>AVAILABLE GEAR</p><strong>{availableEquipment.length}</strong></article>
      </section>

      {returnDialogId && (
        <section className="live-panel tx-narrow" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">Record return: {returnDialogId}</h3>
          <form className="tx-form" onSubmit={onCompleteReturn}>
            <div className="form-field">
              <label htmlFor="eq-return-condition">Incoming condition*</label>
              <textarea
                id="eq-return-condition"
                required
                rows={3}
                value={returnCondition}
                onChange={(event) => setReturnCondition(event.target.value)}
              />
            </div>
            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={returnLoan.isPending}>
                {returnLoan.isPending ? <LoaderCircle className="spin" size={15} /> : <CheckCircle size={15} />}Confirm return
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setReturnDialogId(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {showForm && (
        <section className="live-panel" style={{ marginBottom: 20 }}>
          <h3 className="tx-panel-title">Request equipment loan</h3>
          <form className="tx-form" onSubmit={onSubmitNewLoan}>
            <div className="form-grid">
              <label className="form-field">Equipment*
                <select required value={form.equipmentId} onChange={onFormChange('equipmentId')}>
                  <option value="" disabled>Choose an item</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.name} ({eq.availableQuantity} available)</option>
                  ))}
                </select>
              </label>
              <label className="form-field">Quantity*
                <input type="number" min="1" required value={form.quantity} onChange={onFormChange('quantity')} />
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
              <label className="form-field">Contact*
                <input required value={form.borrowerContact} onChange={onFormChange('borrowerContact')} placeholder="0772-XXXXXX or name@mak.ac.ug" />
              </label>
              <label className="form-field">Date out*
                <input type="date" required value={form.dateOut} onChange={onFormChange('dateOut')} />
              </label>
              <label className="form-field">Expected return date*
                <input type="date" required min={form.dateOut || todayIso()} value={form.dateBack} onChange={onFormChange('dateBack')} />
              </label>
              <label className="form-field">Outgoing condition
                <input value={form.outgoingCondition} onChange={onFormChange('outgoingCondition')} />
              </label>
            </div>
            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={requestLoan.isPending || !form.equipmentId || !form.dateBack || !form.borrowerName.trim()}>
                {requestLoan.isPending ? <LoaderCircle className="spin" size={15} /> : null}Submit for approval
              </button>
              <button type="button" className="btn btn-outline" onClick={() => { setForm(EMPTY_LOAN_FORM); setShowForm(false); }}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="live-panel tx-table-panel">
        <h3 className="tx-panel-title">Active & historical loans</h3>
        {loansQuery.isLoading ? (
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
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const overdue = isLoanOverdue(loan);
                  return (
                    <tr key={loan.id} className={overdue ? 'tx-attention' : ''}>
                      <td className="tx-mono">{loan.id}</td>
                      <td><b className="tx-strong">{loan.equipmentName}</b> <small>×{loan.quantity}</small></td>
                      <td>{loan.borrowerName} <small>({loan.borrowerType})</small></td>
                      <td>{loan.dateOut} → {loan.dateBack}</td>
                      <td><LoanStatusBadge status={loan.status} overdue={overdue} /></td>
                      <td>
                        {loan.status === 'PENDING_APPROVAL' && (
                          <div className="tx-actions">
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => onApprove(loan.id)}><Check size={14} />Approve</button>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => onDecline(loan.id)}><X size={14} />Decline</button>
                          </div>
                        )}
                        {loan.status === 'ACTIVE' && (
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => setReturnDialogId(loan.id)}><CheckCircle size={14} />Mark returned</button>
                        )}
                        {(loan.status === 'RETURNED' || loan.status === 'DECLINED') && (
                          <span className="live-note">{loan.status === 'RETURNED' ? 'Closed' : 'Declined'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {loans.length === 0 && (
                  <tr><td colSpan={6} className="live-empty">No loan records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
