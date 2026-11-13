import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, CheckCircle, Clock, LoaderCircle, ShieldAlert, Undo2, X } from 'lucide-react';
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
                      <th style={{ width: '120px' }}>Loan Ref</th>
                      <th>Equipment</th>
                      <th>Borrower</th>
                      <th>Loan Period</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>
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
                            <td style={{ minWidth: '180px', maxWidth: '260px', whiteSpace: 'normal' }}>
                              <b style={{ fontSize: '14px', color: '#0f172a' }}>{loan.equipmentName}</b>
                              <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '11px', fontWeight: 700, color: '#176b52', background: '#e4efe6', padding: '1px 7px', borderRadius: '4px' }}>
                                Qty: {loan.quantity}
                              </span>
                            </td>
                            <td style={{ minWidth: '170px', maxWidth: '240px', whiteSpace: 'normal' }}>
                              <b style={{ fontSize: '14px', color: '#0f172a' }}>{loan.borrowerName}</b>{' '}
                              <small style={{ color: '#475569', fontWeight: 600 }}>({loan.borrowerType})</small>
                              <br />
                              <small style={{ color: '#64748b', fontSize: '12px' }}>{loan.borrowerContact}</small>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#1e293b' }}>
                                <CalendarDays size={14} style={{ color: '#176b52', flexShrink: 0 }} />
                                <span>{formatDate(loan.dateOut)}</span>
                                <span style={{ color: '#94a3b8', fontWeight: 700 }}>→</span>
                                <b style={{ color: '#0f172a' }}>{formatDate(loan.dateBack)}</b>
                              </div>
                              {overdue && (
                                <div style={{ color: '#991b1b', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                                  <ShieldAlert size={13} />OVERDUE
                                </div>
                              )}
                            </td>
                            <td>
                              <LoanStatusBadge status={overdue ? 'OVERDUE' : loan.status} />
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {loan.status === 'PENDING_APPROVAL' && (
                                <div className="tx-actions" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    style={{ background: '#176b52', color: '#ffffff', fontWeight: 700, padding: '6px 12px', fontSize: '12.5px' }}
                                    title="Approve loan as Manager"
                                    onClick={() => onApprove(loan.id)}
                                  >
                                    <Check size={14} />Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline"
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                    title="Decline loan"
                                    onClick={() => onDecline(loan.id)}
                                  >
                                    <X size={14} />Decline
                                  </button>
                                </div>
                              )}

                              {loan.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, color: '#176b52', borderColor: '#176b52' }}
                                  onClick={() => setReturnDialogId(loan.id)}
                                >
                                  <CheckCircle size={14} />Mark Returned
                                </button>
                              )}

                              {loan.status === 'RETURNED' && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Closed</span>
                              )}

                              {loan.status === 'DECLINED' && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>Declined</span>
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

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px' }}>
                <div className="form-field">
                  <label htmlFor="tl-loan-qty" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Quantity *</label>
                  <input
                    id="tl-loan-qty"
                    type="number"
                    min="1"
                    max="10"
                    required
                    style={{ border: '1.5px solid #94a3b8', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: '#ffffff', minHeight: '42px', width: '100%' }}
                    value={form.quantity}
                    onChange={onFormChange('quantity')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tl-loan-type" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Borrower Type</label>
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
                <label htmlFor="tl-loan-borrower" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Borrower Name & ID *</label>
                <input
                  id="tl-loan-borrower"
                  type="text"
                  required
                  style={{ border: '1.5px solid #94a3b8', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#0f172a', background: '#ffffff', minHeight: '42px', width: '100%' }}
                  placeholder="e.g. Peter Okello (S24/1048)"
                  value={form.borrowerName}
                  onChange={onFormChange('borrowerName')}
                />
              </div>

              <div className="form-field">
                <label htmlFor="tl-loan-contact" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Contact Phone / Email *</label>
                <input
                  id="tl-loan-contact"
                  type="text"
                  required
                  style={{ border: '1.5px solid #94a3b8', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#0f172a', background: '#ffffff', minHeight: '42px', width: '100%' }}
                  placeholder="0772-XXXXXX or student@mak.ac.ug"
                  value={form.borrowerContact}
                  onChange={onFormChange('borrowerContact')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field">
                  <label htmlFor="tl-loan-out" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Date Out *</label>
                  <input
                    id="tl-loan-out"
                    type="date"
                    required
                    style={{ border: '1.5px solid #94a3b8', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: '#ffffff', minHeight: '42px', width: '100%' }}
                    value={form.dateOut}
                    onChange={onFormChange('dateOut')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tl-loan-back" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Expected Return Date *</label>
                  <input
                    id="tl-loan-back"
                    type="date"
                    required
                    min={form.dateOut || todayIso()}
                    style={{ border: '1.5px solid #94a3b8', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: '#ffffff', minHeight: '42px', width: '100%' }}
                    value={form.dateBack}
                    onChange={onFormChange('dateBack')}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tl-loan-cond" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Outgoing Condition Notes</label>
                <textarea
                  id="tl-loan-cond"
                  rows={2}
                  style={{ border: '1.5px solid #94a3b8', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#0f172a', background: '#ffffff', width: '100%' }}
                  value={form.outgoingCondition}
                  onChange={onFormChange('outgoingCondition')}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  minHeight: '46px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: '#176b52',
                  borderColor: '#176b52',
                  color: '#ffffff',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '12px',
                }}
                disabled={requestLoan.isPending || !form.equipmentId || !form.dateBack}
              >
                {requestLoan.isPending ? <LoaderCircle className="spin" size={16} /> : <Clock size={16} />}
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
