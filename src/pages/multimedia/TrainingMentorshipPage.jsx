import { useState } from 'react';
import { Activity, Calendar, CheckCircle2, ChevronRight, GraduationCap, MapPin, Plus, ShieldCheck, User, Users, Wallet, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useConfirmPayment,
  useCreateSession,
  useMarkAttendance,
  useMarkPassed,
  useRegisterParticipant,
  useTrainingDepartments,
  useTrainingOverview,
} from '@/hooks/useTraining';
import { ErrorBanner, Loading } from './shared';

const NEW_SESSION_DEFAULTS = {
  title: '', facilitator: '', date: '', endsAt: '', venue: '', capacity: '', departmentId: '', fee: '', safetyCourse: false,
};
const NEW_PARTICIPANT_DEFAULTS = { name: '', regNumber: '', department: '', contactEmail: '' };
const TRAINING_MANAGER_ROLES = ['ROLE_ADMINISTRATOR', 'ROLE_DEPARTMENT_COORDINATOR'];

const ATTENDANCE_OPTIONS = [
  { value: 'UNMARKED', label: 'Unmarked' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'EXCUSED', label: 'Excused' },
];
const REGISTRATION_LABEL = { PENDING_PAYMENT: 'Pending payment', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled' };

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');
}

function errorMessage(reason, fallback) {
  return reason instanceof Error ? reason.message : fallback;
}

export function TrainingMentorshipPage({ token, roles = [], variant = 'training', bookingReturn = null }) {
  const overviewQuery = useTrainingOverview(token);
  const departmentsQuery = useTrainingDepartments(token);
  const createSessionMutation = useCreateSession(token);
  const registerMutation = useRegisterParticipant(token);
  const markAttendanceMutation = useMarkAttendance(token);
  const confirmPaymentMutation = useConfirmPayment(token);
  const markPassedMutation = useMarkPassed(token);

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState(NEW_SESSION_DEFAULTS);
  const [createError, setCreateError] = useState('');
  const [newParticipant, setNewParticipant] = useState(NEW_PARTICIPANT_DEFAULTS);
  const [rosterError, setRosterError] = useState('');

  const safety = variant === 'safety';
  const canManage = roles.some((role) => TRAINING_MANAGER_ROLES.includes(role));
  const overview = overviewQuery.data;
  const departments = departmentsQuery.data ?? [];
  const cncDepartmentId = departments.find((department) => /cnc|carpentry/i.test(department.name))?.id ?? '';
  const sessions = (overview?.sessions ?? []).filter((session) => !safety || session.safetyCourse);
  const passedCount = sessions.reduce((total, session) => total + session.participants.filter((p) => p.passed).length, 0);
  const seatsFilled = sessions.reduce((total, session) => total + session.enrolledCount, 0);
  const totalSeats = sessions.reduce((total, session) => total + session.capacity, 0);
  const upcomingCount = sessions.filter((session) => session.status === 'UPCOMING' || session.status === 'IN_PROGRESS').length;
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;

  function setSessionField(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setNewSession((prev) => ({ ...prev, [field]: value }));
    };
  }

  function openSession(session) {
    setSelectedSessionId(session.id);
    setNewParticipant(NEW_PARTICIPANT_DEFAULTS);
    setRosterError('');
  }

  async function submitNewSession(event) {
    event.preventDefault();
    setCreateError('');
    const capacity = Number(newSession.capacity);
    if (!newSession.title.trim() || !newSession.facilitator.trim() || !newSession.date || !newSession.venue.trim()
      || !newSession.departmentId) {
      setCreateError('Title, facilitator, date, venue and department are all required.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setCreateError('Capacity must be at least 1 seat.');
      return;
    }
    if (newSession.endsAt && new Date(newSession.endsAt) <= new Date(newSession.date)) {
      setCreateError('The end time must be after the start time.');
      return;
    }
    try {
      await createSessionMutation.mutateAsync({
        title: newSession.title.trim(),
        facilitator: newSession.facilitator.trim(),
        date: new Date(newSession.date).toISOString(),
        ...(newSession.endsAt ? { endsAt: new Date(newSession.endsAt).toISOString() } : {}),
        venue: newSession.venue.trim(),
        capacity,
        departmentId: newSession.departmentId,
        fee: Number(newSession.fee) || 0,
        safetyCourse: newSession.safetyCourse,
        publish: true,
      });
      setNewSession(NEW_SESSION_DEFAULTS);
      setShowCreateForm(false);
    } catch (reason) {
      setCreateError(errorMessage(reason, 'Could not create the session.'));
    }
  }

  async function runRosterAction(action) {
    setRosterError('');
    try {
      await action();
    } catch (reason) {
      setRosterError(errorMessage(reason, 'The action could not be saved.'));
    }
  }

  async function submitParticipant(event) {
    event.preventDefault();
    if (!newParticipant.name.trim() || !newParticipant.regNumber.trim() || !newParticipant.department.trim()) {
      setRosterError('Name, registration number and department are required to sign someone up.');
      return;
    }
    await runRosterAction(async () => {
      await registerMutation.mutateAsync({
        sessionId: selectedSession.id,
        participant: {
          name: newParticipant.name.trim(),
          regNumber: newParticipant.regNumber.trim(),
          department: newParticipant.department.trim(),
          ...(newParticipant.contactEmail.trim() ? { contactEmail: newParticipant.contactEmail.trim() } : {}),
        },
      });
      setNewParticipant(NEW_PARTICIPANT_DEFAULTS);
    });
  }

  const activeParticipants = (selectedSession?.participants ?? []).filter((p) => p.status !== 'CANCELLED');
  const sessionFull = selectedSession ? activeParticipants.length >= selectedSession.capacity : false;

  return (
    <div className={`live-page page-enter${safety ? ' cnc-safety-page' : ''}`}>
      {safety && bookingReturn && (
        <div className="cnc-safety-booking-return" role="status">
          <p>
            This machine booking needs a recorded CNC safety pass. Contact your department coordinator or an administrator to arrange a safety session or verify a pass you already earned. Your booking details are saved.
          </p>
          <Link
            className="btn btn-outline"
            to="/cnc/machines/book"
            state={{ bookingDraft: bookingReturn, returnedFromSafetyCourse: true }}
          >
            Return to machine booking
          </Link>
        </div>
      )}
      <div className={`live-page-heading${safety ? ' cnc-safety-hero' : ''}`}>
        <div>
          <p className="eyebrow">{safety ? 'CNC & CARPENTRY · SAFETY STANDARD' : 'OPERATIONS'}</p>
          <h1>{safety ? 'Safety Course' : 'Training & Mentorship'}</h1>
          <p>{safety
            ? 'View CNC safety sessions and pass status. Authorized staff manage registration and record verified passes.'
            : 'Published sessions, registration capacity and mentorship follow-ups.'}</p>
          {safety && (
            <div className="cnc-safety-hero__assurance">
              <ShieldCheck size={16} aria-hidden="true" />
              A verified pass unlocks eligible machine bookings.
            </div>
          )}
        </div>
        <div className={`heading-actions${safety ? ' cnc-safety-hero__actions' : ''}`}>
          {safety && (
            <Link to="/cnc/machines/book" className="btn cnc-safety-hero__book">
              Book a machine <ChevronRight size={15} aria-hidden="true" />
            </Link>
          )}
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={() => {
              setNewSession(safety ? { ...NEW_SESSION_DEFAULTS, safetyCourse: true, departmentId: cncDepartmentId } : NEW_SESSION_DEFAULTS);
              setCreateError('');
              setShowCreateForm(true);
            }}>
              <Plus size={15} />New session
            </button>
          )}
        </div>
        {safety && (
          <div className="cnc-safety-hero__seal" aria-hidden="true">
            <div className="cnc-safety-hero__seal-icon"><ShieldCheck size={32} /></div>
            <span>ACCESS CLEARANCE</span>
            <strong>CN5</strong>
            <small>Safety pass required</small>
          </div>
        )}
      </div>

      <ErrorBanner error={overviewQuery.error} fallback="Could not load training sessions." />
      {safety && !canManage && !bookingReturn && (
        <div className="cnc-safety-booking-return" role="note">
          Safety-session registration and pass recording are handled by an administrator or department coordinator. Select a session to view its details.
        </div>
      )}

      <section className={`live-metrics tx-metrics${safety ? ' cnc-safety-metrics' : ''}`} aria-label={safety ? 'Safety course metrics' : 'Training KPI metrics'}>
        <article className="live-metric">
          <p>UPCOMING SESSIONS <GraduationCap size={14} /></p>
          <strong>{upcomingCount}</strong>
          {safety && <small>Published safety training</small>}
        </article>
        <article className="live-metric">
          <p>SEATS FILLED <User size={14} /></p>
          <strong>{seatsFilled}/{totalSeats}</strong>
          {safety && <small>Enrolled across all sessions</small>}
        </article>
        {safety
          ? <article className="live-metric"><p>PASSED <Activity size={14} /></p><strong>{passedCount}</strong><small>Verified course completions</small></article>
          : <article className="live-metric"><p>MENTORSHIP FOLLOW-UPS <Activity size={14} /></p><strong>{overview?.mentorshipFollowUps ?? 0}</strong></article>}
      </section>

      <section className={`live-panel tx-table-panel${safety ? ' cnc-safety-sessions-panel' : ''}`}>
        {safety && (
          <div className="cnc-safety-sessions-heading">
            <div>
              <p className="eyebrow">LEARN · PRACTISE · GET CLEARED</p>
              <h2>Available safety sessions</h2>
              <p>Select a session to view details and sign up.</p>
            </div>
            <span className="cnc-safety-session-count">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span>
          </div>
        )}
        {overviewQuery.isPending ? (
          <Loading label="Loading training sessions…" variant="table" />
        ) : safety ? (
          <div className="cnc-safety-session-list">
            {sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                className="cnc-safety-session"
                data-testid={`session-row-${session.id}`}
                onClick={() => openSession(session)}
              >
                <span className="cnc-safety-session__icon"><GraduationCap size={20} aria-hidden="true" /></span>
                <span className="cnc-safety-session__main">
                  <span className="cnc-safety-session__tag">CN5 SAFETY SESSION</span>
                  <strong>{session.title}</strong>
                  <span className="cnc-safety-session__facilitator">{session.facilitator}</span>
                </span>
                <span className="cnc-safety-session__details">
                  <span className={`cnc-safety-session__fee${session.fee > 0 ? ' is-paid' : ''}`}>
                    {session.fee > 0 ? `UGX ${session.fee.toLocaleString()}` : 'FREE'}
                  </span>
                  <span><Calendar size={13} aria-hidden="true" />{formatDateTime(session.date)}</span>
                  <span><Users size={13} aria-hidden="true" />{session.enrolledCount}/{session.capacity} enrolled</span>
                </span>
                <ChevronRight className="cnc-safety-session__arrow" size={18} aria-hidden="true" />
              </button>
            ))}
            {sessions.length === 0 && !overviewQuery.error && (
              <div className="cnc-safety-empty">
                <span><ShieldCheck size={24} aria-hidden="true" /></span>
                <h3>No safety sessions published yet</h3>
                <p>Check back soon, or contact the CNC team if you need your existing pass verified.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr>
                  <th>SESSION</th>
                  <th>FACILITATOR</th>
                  <th>DATE</th>
                  <th>FEE</th>
                  <th>ENROLLED</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} data-testid={`session-row-${session.id}`} onClick={() => openSession(session)}>
                    <td><b className="tx-strong">{session.title}</b></td>
                    <td>{session.facilitator}</td>
                    <td className="tx-mono">{formatDateTime(session.date)}</td>
                    <td>{session.fee > 0 ? `UGX ${session.fee.toLocaleString()}` : 'Free'}</td>
                    <td>{session.enrolledCount}/{session.capacity}</td>
                  </tr>
                ))}
                {sessions.length === 0 && !overviewQuery.error && (
                  <tr><td colSpan={5} className="live-empty">{safety ? 'No safety sessions published yet.' : 'No training sessions published yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedSession && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelectedSessionId(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Training Session Details</span>
                <h3>{selectedSession.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSessionId(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Facilitator:</strong> {selectedSession.facilitator}</span></div>
              <div className="ops-modal-fact"><Calendar size={14} color="var(--muted)" /><span><strong>Date & Time:</strong> {formatDateTime(selectedSession.date)}{selectedSession.endsAt ? ` – ${formatDateTime(selectedSession.endsAt)}` : ''}</span></div>
              <div className="ops-modal-fact"><MapPin size={14} color="var(--muted)" /><span><strong>Venue:</strong> {selectedSession.venue}</span></div>
              <div className="ops-modal-fact"><Users size={14} color="var(--muted)" /><span><strong>Enrolled:</strong> {selectedSession.enrolledCount} of {selectedSession.capacity} seats filled</span></div>
              <div className="ops-modal-fact"><Wallet size={14} color="var(--muted)" /><span><strong>Fee:</strong> {selectedSession.fee > 0 ? `UGX ${selectedSession.fee.toLocaleString()} — seats stay pending until payment is confirmed` : 'Free — seats are confirmed on sign-up'}</span></div>
            </div>

            {selectedSession.description && <p className="ops-modal-desc">{selectedSession.description}</p>}

            {rosterError && <p className="tx-field-error" role="alert">{rosterError}</p>}

            <div>
              <div className="ops-roster-head"><b>Participant Roster</b><span>{activeParticipants.length} signed up</span></div>
              {activeParticipants.length === 0 ? (
                <p className="live-empty">Nobody has signed up yet.</p>
              ) : (
                <div className="ops-roster">
                  {activeParticipants.map((participant) => {
                    const confirmed = participant.status === 'CONFIRMED';
                    return (
                      <div key={participant.id} className="ops-roster-row" style={{ gap: 8, flexWrap: 'wrap' }} data-testid={`participant-${participant.id}`}>
                        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                          <strong>{participant.name}</strong>
                          <small>{participant.regNumber} · {participant.department}</small>
                        </div>
                        <span className={`partner-status ${confirmed ? 'active' : 'renewal-due'}`} style={{ whiteSpace: 'nowrap' }}>
                          {REGISTRATION_LABEL[participant.status]}
                        </span>
                        {canManage && participant.status === 'PENDING_PAYMENT' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={confirmPaymentMutation.isPending}
                            onClick={() => runRosterAction(() => confirmPaymentMutation.mutateAsync({
                              sessionId: selectedSession.id, participantId: participant.id,
                            }))}
                          >
                            Confirm payment
                          </button>
                        )}
                        {canManage && participant.passed ? (
                          <span
                            className="partner-status active"
                            aria-label={`Attendance for ${participant.name}: Present, locked after pass`}
                            title="Attendance stays Present after a participant passes."
                          >
                            <CheckCircle2 size={13} aria-hidden="true" />Present · locked
                          </span>
                        ) : canManage ? (
                          <select
                            aria-label={`Attendance for ${participant.name}`}
                            value={participant.attendance}
                            disabled={!confirmed || markAttendanceMutation.isPending}
                            title={confirmed ? undefined : 'Attendance can only be recorded once payment is confirmed.'}
                            onChange={(event) => runRosterAction(() => markAttendanceMutation.mutateAsync({
                              sessionId: selectedSession.id, participantId: participant.id, attendance: event.target.value,
                            }))}
                          >
                            {ATTENDANCE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} disabled={option.value === 'UNMARKED'}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="partner-status">{ATTENDANCE_OPTIONS.find((option) => option.value === participant.attendance)?.label ?? 'Unmarked'}</span>
                        )}
                        {selectedSession.safetyCourse && (participant.passed ? (
                          <span className="partner-status active">Passed</span>
                        ) : canManage ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={!confirmed || participant.attendance !== 'PRESENT' || markPassedMutation.isPending}
                            title={participant.attendance === 'PRESENT' ? undefined : 'Mark the participant present first.'}
                            onClick={() => runRosterAction(() => markPassedMutation.mutateAsync({
                              sessionId: selectedSession.id, participantId: participant.id,
                            }))}
                          >
                            Mark passed
                          </button>
                        ) : (
                          <span className="partner-status renewal-due">Not passed</span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {canManage ? <form className={`tx-form${safety ? ' cnc-safety-roster-form' : ''}`} onSubmit={submitParticipant} aria-label="Sign up a participant">
              <div className="ops-roster-head"><b>Sign up a participant</b><span>{sessionFull ? 'Session full' : `${selectedSession.capacity - activeParticipants.length} seats left`}</span></div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="participant-name">Full name</label>
                <input id="participant-name" value={newParticipant.name} onChange={(event) => setNewParticipant((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="participant-reg">Registration number</label>
                <input id="participant-reg" value={newParticipant.regNumber} onChange={(event) => setNewParticipant((prev) => ({ ...prev, regNumber: event.target.value }))} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="participant-department">Department or course</label>
                <input id="participant-department" value={newParticipant.department} onChange={(event) => setNewParticipant((prev) => ({ ...prev, department: event.target.value }))} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="participant-email">Email (optional)</label>
                <input id="participant-email" type="email" value={newParticipant.contactEmail} onChange={(event) => setNewParticipant((prev) => ({ ...prev, contactEmail: event.target.value }))} />
              </div>
              <div className="ops-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setSelectedSessionId(null)}>Done</button>
                <button type="submit" className="btn btn-primary" disabled={sessionFull || registerMutation.isPending}>
                  {registerMutation.isPending ? 'Signing up…' : 'Sign up'}
                </button>
              </div>
            </form> : (
              <div className="ops-notice amber">
                <div className="ops-notice-head">Registration managed by staff</div>
                <p>Contact your department coordinator or an administrator to register for this session and have your pass recorded after completion.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateForm && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">New Training Session</span>
                <h3>Create a session</h3>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <form className={`tx-form${safety ? ' cnc-safety-create-form' : ''}`} onSubmit={submitNewSession}>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-title">Title</label>
                <input id="new-session-title" value={newSession.title} onChange={setSessionField('title')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-facilitator">Facilitator</label>
                <input id="new-session-facilitator" value={newSession.facilitator} onChange={setSessionField('facilitator')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-date">Date & time</label>
                <input id="new-session-date" type="datetime-local" value={newSession.date} onChange={setSessionField('date')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-ends">Ends at (optional)</label>
                <input id="new-session-ends" type="datetime-local" value={newSession.endsAt} min={newSession.date || undefined} onChange={setSessionField('endsAt')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-venue">Venue</label>
                <input id="new-session-venue" value={newSession.venue} onChange={setSessionField('venue')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-department">Department</label>
                <select id="new-session-department" value={newSession.departmentId} onChange={setSessionField('departmentId')} disabled={departmentsQuery.isPending}>
                  <option value="">{departmentsQuery.isPending ? 'Loading departments…' : 'Choose a department'}</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
                {departmentsQuery.error && <small className="tx-field-error">Could not load departments: {departmentsQuery.error.message}</small>}
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-capacity">Capacity</label>
                <input id="new-session-capacity" type="number" min="1" value={newSession.capacity} onChange={setSessionField('capacity')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-session-fee">Fee per seat (UGX, 0 for free)</label>
                <input id="new-session-fee" type="number" min="0" value={newSession.fee} onChange={setSessionField('fee')} />
              </div>
              <label className="tx-check">
                <input type="checkbox" checked={newSession.safetyCourse} onChange={setSessionField('safetyCourse')} />
                This is a safety course (records a pass for each attendee)
              </label>
              {createError && <p className="tx-field-error" role="alert">{createError}</p>}
              <div className="ops-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? 'Creating…' : 'Create session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
