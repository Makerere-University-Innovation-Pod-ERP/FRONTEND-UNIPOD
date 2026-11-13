import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, Clock, LoaderCircle, ShieldAlert, Undo2, X } from 'lucide-react';
import { isLoanOverdue, todayIso } from '@/lib/telecoms';
import { formatDate } from '@/lib/presentation';
import {
  useApproveEquipmentLoan,
  useDeclineEquipmentLoan,
  useRequestEquipmentLoan,
  useReturnEquipmentLoan,
  useTelecomsEquipment,
  useTelecomsLoans,
} from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, LoanStatusBadge, PageHeading } from './shared';
import { useUnauthorizedRedirect } from './helpers';
import { CurvedSelect } from '@/components/CurvedSelect';

const EMPTY_LOAN_FORM = {
  equipmentId: '',
  quantity: 1,
  borrowerName: '',
  borrowerType: 'Student',
  borrowerContact: '',
  dateOut: todayIso(),
  dateBack: '',
  outgoingCondition: 'Calibrated and clean with complete test accessories.',
};

export function EquipmentLendingPage({ token, onUnauthorized }) {
  const loansQuery = useTelecomsLoans(token);
  const equipmentQuery = useTelecomsEquipment(token);

  const requestLoan = useRequestEquipmentLoan(token);
  const approveLoan = useApproveEquipmentLoan(token);
  const declineLoan = useDeclineEquipmentLoan(token);
  const returnLoan = useReturnEquipmentLoan(token);

  const [form, setForm] = useState(EMPTY_LOAN_FORM);
  const [returnDialogId, setReturnDialogId] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Returned in verified working condition.');
  const [actionNotice, setActionNotice] = useState('');

  useUnauthorizedRedirect(
    onUnauthorized,
    loansQuery.error,
    equipmentQuery.error,
    requestLoan.error,
    approveLoan.error,
    declineLoan.error,
    returnLoan.error,
  );

  const loans = loansQuery.data ?? [];
  const equipmentList = equipmentQuery.data ?? [];
  const availableEquipment = equipmentList.filter((eq) => eq.availableQuantity > 0 && eq.state !== 'FAULTY');

  const onFormChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const onSubmitNewLoan = async (e) => {
    e.preventDefault();
    if (!form.equipmentId || !form.borrowerName.trim() || !form.dateBack) return;
    try {
      await requestLoan.mutateAsync({
        ...form,
        quantity: Number(form.quantity) || 1,
      });
      setActionNotice('Loan request submitted for Manager approval (Rule 11).');
      setForm(EMPTY_LOAN_FORM);
    } catch {
      // Error handled below
    }
  };

  const onApprove = async (loanId) => {
    try {
      await approveLoan.mutateAsync({ loanId, note: 'Manager approval granted for external project deployment.' });
      setActionNotice(`Loan ${loanId} approved. Equipment is active on loan.`);
    } catch {
      // Error handled
    }
  };

  const onDecline = async (loanId) => {
    try {
      await declineLoan.mutateAsync({ loanId, reason: 'Declined: asset needed for lab practical.' });
      setActionNotice(`Loan ${loanId} declined.`);
    } catch {
      // Error handled
    }
  };

  const onCompleteReturn = async (e) => {
    e.preventDefault();
    if (!returnDialogId) return;
    try {
      await returnLoan.mutateAsync({ loanId: returnDialogId, condition: returnCondition });
      setActionNotice(`Loan ${returnDialogId} marked returned. Item available again in lab.`);
      setReturnDialogId(null);
    } catch {
      // Error handled
    }
  };

  return (
    <div className="live-page page-enter">
      <div className="tx-week-head">
        <PageHeading
          eyebrow="TELECOMS · WORKFLOW 6.3"
          title="Equipment Lending Desk"
          intro="Rule 11: Equipment stays in the Pod unless authorized by a Manager. Track checkout, conditions and returns."
        />
        <Link className="btn btn-outline" to="/telecoms/equipment">
          <ArrowLeft size={14} />Back to Equipment Register
        </Link>
      </div>

      <ErrorBanner
        error={
          loansQuery.error ||
          requestLoan.error ||
          approveLoan.error ||
          declineLoan.error ||
          returnLoan.error
        }
        fallback="Could not complete equipment loan action."
      />

      {actionNotice && <p className="tx-success">{actionNotice}</p>}

      <div className="detail-grid">
        {/* Left side: Active & Pending Loans Table */}
        <div className="tx-stack">
          <section className="live-panel">
            <h2 className="tx-panel-title">Active & Historical Loans</h2>
            {loansQuery.isLoading ? (
              <Loading label="Loading equipment loans…" />
            ) : (
              <div className="live-table-wrap">
                <table className="live-table">
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Loan Ref</th>
                      <th>Equipment</th>
                      <th>Borrower</th>
                      <th>Loan Period</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="live-empty">No loan records yet.</td>
                      </tr>
                    ) : (
                      loans.map((loan) => {
                        const overdue = isLoanOverdue(loan);
                        return (
                          <tr key={loan.id} className={overdue ? 'tx-attention' : ''}>
                            <td className="tx-mono"><b>{loan.id}</b></td>
                            <td style={{ minWidth: '160px', maxWidth: '240px', whiteSpace: 'normal' }}>
                              <b>{loan.equipmentName}</b> <small style={{ color: 'var(--ink-soft)' }}>(Qty: {loan.quantity})</small>
                            </td>
                            <td style={{ minWidth: '160px', maxWidth: '220px', whiteSpace: 'normal' }}>
                              <b>{loan.borrowerName}</b> <small style={{ color: 'var(--ink-soft)' }}>({loan.borrowerType})</small>
                              <br />
                              <small className="tx-muted">{loan.borrowerContact}</small>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span>{formatDate(loan.dateOut)} → <b>{formatDate(loan.dateBack)}</b></span>
                              {overdue && (
                                <div style={{ color: 'var(--rose)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                  <ShieldAlert size={12} />OVERDUE
                                </div>
                              )}
                            </td>
                            <td>
                              <LoanStatusBadge status={overdue ? 'OVERDUE' : loan.status} />
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {loan.status === 'PENDING_APPROVAL' && (
                                <div className="tx-actions" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    title="Approve loan as Manager"
                                    onClick={() => onApprove(loan.id)}
                                  >
                                    <Check size={13} />Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    title="Decline loan"
                                    onClick={() => onDecline(loan.id)}
                                  >
                                    <X size={13} />Decline
                                  </button>
                                </div>
                              )}

                              {loan.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => setReturnDialogId(loan.id)}
                                >
                                  <CheckCircle size={13} />Mark Returned
                                </button>
                              )}

                              {loan.status === 'RETURNED' && (
                                <small className="tx-muted">Closed</small>
                              )}

                              {loan.status === 'DECLINED' && (
                                <small className="tx-muted">Declined</small>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right side: Request Loan Form */}
        <div className="tx-stack">
          <section className="live-panel">
            <h2 className="tx-panel-title">Request Equipment Loan</h2>
            <p className="tx-inline-note">
              Loans require manager approval before handover. Only undamaged, available gear may be requested.
            </p>
            <form className="tx-form" onSubmit={onSubmitNewLoan}>
              <div className="form-field">
                <label htmlFor="tl-loan-eq">Select Equipment *</label>
                <CurvedSelect
                  id="tl-loan-eq"
                  placeholder="Choose item…"
                  value={form.equipmentId}
                  options={[
                    { value: '', label: 'Choose item…' },
                    ...availableEquipment.map((eq) => ({
                      value: eq.id,
                      label: `${eq.name} (${eq.availableQuantity} available)`,
                    })),
                  ]}
                  onChange={onFormChange('equipmentId')}
                />
              </div>

              <div className="tx-quote-row">
                <div className="form-field">
                  <label htmlFor="tl-loan-qty">Quantity *</label>
                  <input
                    id="tl-loan-qty"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={form.quantity}
                    onChange={onFormChange('quantity')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tl-loan-type">Borrower Type</label>
                  <CurvedSelect
                    id="tl-loan-type"
                    value={form.borrowerType}
                    options={[
                      { value: 'Student', label: 'Student Project' },
                      { value: 'Staff', label: 'Department Staff' },
                      { value: 'Company', label: 'External / Partner' },
                    ]}
                    onChange={onFormChange('borrowerType')}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tl-loan-borrower">Borrower Name & ID *</label>
                <input
                  id="tl-loan-borrower"
                  type="text"
                  required
                  placeholder="e.g. Peter Okello (S24/1048)"
                  value={form.borrowerName}
                  onChange={onFormChange('borrowerName')}
                />
              </div>

              <div className="form-field">
                <label htmlFor="tl-loan-contact">Contact Phone / Email *</label>
                <input
                  id="tl-loan-contact"
                  type="text"
                  required
                  placeholder="0772-XXXXXX or student@mak.ac.ug"
                  value={form.borrowerContact}
                  onChange={onFormChange('borrowerContact')}
                />
              </div>

              <div className="tx-quote-row">
                <div className="form-field">
                  <label htmlFor="tl-loan-out">Date Out *</label>
                  <input
                    id="tl-loan-out"
                    type="date"
                    required
                    value={form.dateOut}
                    onChange={onFormChange('dateOut')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tl-loan-back">Expected Return Date *</label>
                  <input
                    id="tl-loan-back"
                    type="date"
                    required
                    min={form.dateOut || todayIso()}
                    value={form.dateBack}
                    onChange={onFormChange('dateBack')}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tl-loan-cond">Outgoing Condition Notes</label>
                <textarea
                  id="tl-loan-cond"
                  rows={2}
                  value={form.outgoingCondition}
                  onChange={onFormChange('outgoingCondition')}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={requestLoan.isPending || !form.equipmentId || !form.dateBack}
              >
                {requestLoan.isPending ? <LoaderCircle className="spin" size={15} /> : <Clock size={15} />}
                Submit Loan for Approval
              </button>
            </form>
          </section>

          {/* Modal / Dialog for marking return */}
          {returnDialogId && (
            <div className="live-panel" style={{ border: '2px solid var(--forest)' }}>
              <h3 className="tx-panel-title">Record Equipment Return: {returnDialogId}</h3>
              <form className="tx-form" onSubmit={onCompleteReturn}>
                <div className="form-field">
                  <label htmlFor="tl-return-cond">Incoming Condition Inspection Notes *</label>
                  <textarea
                    id="tl-return-cond"
                    required
                    rows={3}
                    placeholder="Verify power up, display, knobs, probe integrity, physical cleanliness…"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                  />
                </div>
                <div className="tx-actions">
                  <button type="submit" className="btn btn-primary" disabled={returnLoan.isPending}>
                    {returnLoan.isPending ? <LoaderCircle className="spin" size={14} /> : <CheckCircle size={14} />}
                    Confirm Check-In
                  </button>
                  <button type="button" className="btn" onClick={() => setReturnDialogId(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
