import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle,
  Clock,
  LoaderCircle,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
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

  const [showForm, setShowForm] = useState(true);
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

  const activeCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const pendingCount = loans.filter((l) => l.status === 'PENDING_APPROVAL').length;
  const overdueCount = loans.filter((l) => isLoanOverdue(l)).length;

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
      <div className="tx-week-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <PageHeading
          eyebrow="TELECOMS · WORKFLOW 6.3"
          title="Equipment Lending Desk"
          intro="Rule 11: Equipment stays in the Pod unless authorized by a Manager. Track checkout, conditions and returns."
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link className="btn btn-outline" to="/telecoms/equipment">
            <ArrowLeft size={14} /> Back to Equipment Register
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((prev) => !prev)}
            style={{ background: '#176b52', borderColor: '#176b52', color: '#ffffff' }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Hide Request Form' : 'Request Equipment Loan'}
          </button>
        </div>
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

      {actionNotice && <p className="tx-success" style={{ marginBottom: '18px' }}>{actionNotice}</p>}

      {/* Lending Metric Overview */}
      <div className="live-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="live-metric">
          <p>Active On Loan</p>
          <strong style={{ color: 'var(--ink)' }}>{activeCount}</strong>
          <small>Equipment deployed in field / student projects</small>
        </div>
        <div className="live-metric">
          <p>Pending Approval</p>
          <strong style={{ color: pendingCount > 0 ? 'var(--amber)' : 'var(--ink)' }}>{pendingCount}</strong>
          <small>Awaiting Telecoms Manager sign-off</small>
        </div>
        <div className="live-metric">
          <p>Overdue Returns</p>
          <strong style={{ color: overdueCount > 0 ? 'var(--rose)' : 'var(--ink)' }}>{overdueCount}</strong>
          <small>{overdueCount > 0 ? 'Urgent follow-up required' : 'All loans currently on schedule'}</small>
        </div>
        <div className="live-metric">
          <p>Available Gear</p>
          <strong style={{ color: 'var(--green)' }}>{availableEquipment.length}</strong>
          <small>Catalog items currently ready for checkout</small>
        </div>
      </div>

      {/* Return Inspection Dialog (shown when user clicks Mark Returned) */}
      {returnDialogId && (
        <section className="live-panel" style={{ border: '2px solid #176b52', background: 'var(--surface-raised)', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 className="tx-panel-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
              Record Equipment Return: <span style={{ color: 'var(--green)' }}>{returnDialogId}</span>
            </h3>
            <button type="button" className="icon-button" onClick={() => setReturnDialogId(null)} title="Cancel return check-in">
              <X size={16} />
            </button>
          </div>
          <form className="tx-form" onSubmit={onCompleteReturn}>
            <div className="form-field">
              <label htmlFor="tl-return-cond" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                Incoming Condition Inspection Notes *
              </label>
              <textarea
                id="tl-return-cond"
                required
                rows={3}
                style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--ink)', background: 'var(--surface)', width: '100%' }}
                placeholder="Verify power up, display, knobs, probe integrity, physical cleanliness…"
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
              />
            </div>
            <div className="tx-actions" style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: '#176b52', color: '#ffffff', fontWeight: 750, padding: '8px 20px' }}
                disabled={returnLoan.isPending}
              >
                {returnLoan.isPending ? <LoaderCircle className="spin" size={15} /> : <CheckCircle size={15} />}
                Confirm Check-In
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setReturnDialogId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Request Loan Form Panel */}
      {showForm && (
        <section className="live-panel" style={{ marginBottom: '24px', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '24px', background: 'var(--surface)', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
            <div>
              <h2 className="tx-panel-title" style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--ink)' }}>
                Request Equipment Loan
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--muted)' }}>
                Loans require manager approval before handover. Only undamaged, available gear may be requested.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setShowForm(false)}
              style={{ fontSize: '12px', padding: '5px 10px' }}
              title="Hide request form"
            >
              <X size={14} /> Close
            </button>
          </div>

          <form className="tx-form" onSubmit={onSubmitNewLoan}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '18px' }}>
              {/* Column 1: Equipment Selection & Details */}
              <div style={{ display: 'grid', gap: '14px' }}>
                <div className="form-field">
                  <label htmlFor="tl-loan-eq" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Select Equipment *
                  </label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                  <div className="form-field">
                    <label htmlFor="tl-loan-qty" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                      Quantity *
                    </label>
                    <input
                      id="tl-loan-qty"
                      type="number"
                      min="1"
                      max="10"
                      required
                      style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', background: 'var(--surface)', minHeight: '42px', width: '100%' }}
                      value={form.quantity}
                      onChange={onFormChange('quantity')}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="tl-loan-type" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                      Borrower Type
                    </label>
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
              </div>

              {/* Column 2: Borrower Identity & Contact */}
              <div style={{ display: 'grid', gap: '14px' }}>
                <div className="form-field">
                  <label htmlFor="tl-loan-borrower" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Borrower Name & ID *
                  </label>
                  <input
                    id="tl-loan-borrower"
                    type="text"
                    required
                    style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: 'var(--ink)', background: 'var(--surface)', minHeight: '42px', width: '100%' }}
                    placeholder="e.g. Peter Okello (S24/1048)"
                    value={form.borrowerName}
                    onChange={onFormChange('borrowerName')}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="tl-loan-contact" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Contact Phone / Email *
                  </label>
                  <input
                    id="tl-loan-contact"
                    type="text"
                    required
                    style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: 'var(--ink)', background: 'var(--surface)', minHeight: '42px', width: '100%' }}
                    placeholder="0772-XXXXXX or student@mak.ac.ug"
                    value={form.borrowerContact}
                    onChange={onFormChange('borrowerContact')}
                  />
                </div>
              </div>

              {/* Column 3: Dates & Outgoing Condition */}
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-field">
                    <label htmlFor="tl-loan-out" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                      Date Out *
                    </label>
                    <input
                      id="tl-loan-out"
                      type="date"
                      required
                      style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', background: 'var(--surface)', minHeight: '42px', width: '100%' }}
                      value={form.dateOut}
                      onChange={onFormChange('dateOut')}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="tl-loan-back" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                      Expected Return Date *
                    </label>
                    <input
                      id="tl-loan-back"
                      type="date"
                      required
                      min={form.dateOut || todayIso()}
                      style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', background: 'var(--surface)', minHeight: '42px', width: '100%' }}
                      value={form.dateBack}
                      onChange={onFormChange('dateBack')}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="tl-loan-cond" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Outgoing Condition Notes
                  </label>
                  <input
                    id="tl-loan-cond"
                    type="text"
                    style={{ border: '1.5px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: 'var(--ink)', background: 'var(--surface)', minHeight: '42px', width: '100%' }}
                    value={form.outgoingCondition}
                    onChange={onFormChange('outgoingCondition')}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-soft)' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setForm(EMPTY_LOAN_FORM); setShowForm(false); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  minHeight: '42px',
                  padding: '0 24px',
                  fontSize: '14px',
                  fontWeight: 750,
                  background: '#176b52',
                  borderColor: '#176b52',
                  color: '#ffffff',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                disabled={requestLoan.isPending || !form.equipmentId || !form.dateBack || !form.borrowerName.trim()}
              >
                {requestLoan.isPending ? <LoaderCircle className="spin" size={16} /> : <Clock size={16} />}
                Submit Loan for Approval
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Main Table: Active & Historical Loans */}
      <section className="live-panel" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', background: 'var(--surface)', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h2 className="tx-panel-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}>
              Active & Historical Loans
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Showing {loans.length} recorded equipment loans across Telecoms lab inventory.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
              style={{ background: '#176b52', color: '#ffffff', fontWeight: 750, fontSize: '13px' }}
            >
              <Plus size={14} /> Request New Loan
            </button>
          )}
        </div>

        {loansQuery.isLoading ? (
          <Loading label="Loading equipment loans…" variant="table" />
        ) : (
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Loan Ref</th>
                  <th style={{ minWidth: '220px' }}>Equipment</th>
                  <th style={{ minWidth: '220px' }}>Borrower</th>
                  <th style={{ minWidth: '210px' }}>Loan Period</th>
                  <th style={{ width: '160px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '170px', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="live-empty" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)', fontSize: '14px' }}>
                      No loan records yet. Use the Request form above to create the first equipment loan.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => {
                    const overdue = isLoanOverdue(loan);
                    return (
                      <tr key={loan.id} className={overdue ? 'tx-attention' : ''}>
                        <td className="tx-mono">
                          <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{loan.id}</b>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <b style={{ fontSize: '14.5px', color: 'var(--ink)' }}>{loan.equipmentName}</b>
                            <span style={{ fontSize: '11px', fontWeight: 750, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                              Qty: {loan.quantity}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{loan.borrowerName}</b>{' '}
                            <span style={{ color: 'var(--ink-soft)', fontWeight: 600, fontSize: '12px' }}>({loan.borrowerType})</span>
                            <div style={{ color: 'var(--muted)', fontSize: '12.5px', marginTop: '2px' }}>
                              {loan.borrowerContact}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--ink)' }}>
                            <CalendarDays size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
                            <span>{formatDate(loan.dateOut)}</span>
                            <span style={{ color: 'var(--muted)', fontWeight: 700 }}>→</span>
                            <b style={{ color: 'var(--ink)' }}>{formatDate(loan.dateBack)}</b>
                          </div>
                          {overdue && (
                            <div style={{ color: 'var(--rose)', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: 'var(--rose-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                              <ShieldAlert size={13} /> OVERDUE
                            </div>
                          )}
                        </td>
                        <td>
                          <LoanStatusBadge status={overdue ? 'OVERDUE' : loan.status} />
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                          {loan.status === 'PENDING_APPROVAL' && (
                            <div className="tx-actions" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                style={{ background: '#176b52', color: '#ffffff', fontWeight: 750, padding: '6px 12px', fontSize: '12.5px' }}
                                title="Approve loan as Manager"
                                onClick={() => onApprove(loan.id)}
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                title="Decline loan"
                                onClick={() => onDecline(loan.id)}
                              >
                                <X size={14} /> Decline
                              </button>
                            </div>
                          )}

                          {loan.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ padding: '6px 14px', fontSize: '12.5px', fontWeight: 750, color: 'var(--green)', borderColor: '#176b52' }}
                              onClick={() => setReturnDialogId(loan.id)}
                            >
                              <CheckCircle size={14} /> Mark Returned
                            </button>
                          )}

                          {loan.status === 'RETURNED' && (
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--muted)' }}>Closed</span>
                          )}

                          {loan.status === 'DECLINED' && (
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--rose)' }}>Declined</span>
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
  );
}
