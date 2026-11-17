import { useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MapPin,
  Plus,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { formatUgx, todayIso } from '@/lib/telecoms';
import { formatDate } from '@/lib/presentation';
import {
  useCreateBootcampSession,
  useEnrollBootcamp,
  useSaveBootcampAttendance,
  useTelecomsBootcamps,
} from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading, PaymentStatus } from './shared';
import { useUnauthorizedRedirect } from './helpers';

const EMPTY_SESSION_FORM = {
  topic: '',
  instructor: 'Eng. Kaddu',
  date: '',
  start: '09:00',
  end: '16:00',
  capacity: 25,
  fee: 60000,
};

const EMPTY_ENROLL_FORM = {
  name: '',
  email: '',
  studentNumber: '',
};

export function BootcampSessionsPage({ token, onUnauthorized }) {
  const bootcampsQuery = useTelecomsBootcamps(token);
  const createSession = useCreateBootcampSession(token);
  const enrollParticipant = useEnrollBootcamp(token);
  const saveAttendance = useSaveBootcampAttendance(token);

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION_FORM);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [enrollForm, setEnrollForm] = useState(EMPTY_ENROLL_FORM);
  const [showEnroll, setShowEnroll] = useState(false);
  const [attendanceState, setAttendanceState] = useState({});
  const [notice, setNotice] = useState('');

  useUnauthorizedRedirect(
    onUnauthorized,
    bootcampsQuery.error,
    createSession.error,
    enrollParticipant.error,
    saveAttendance.error,
  );

  const sessions = bootcampsQuery.data ?? [];
  const activeSessionId = selectedSessionId || sessions[0]?.id;
  const currentSession = sessions.find((s) => s.id === activeSessionId);

  // Initialize attendance map when session changes
  const currentAttendance = currentSession?.attendance ?? [];
  const currentEnrolled = currentSession?.enrolled ?? [];

  const handleAttendanceToggle = (participantId, status) => {
    setAttendanceState((prev) => ({
      ...prev,
      [participantId]: status,
    }));
  };

  const getParticipantAttendance = (participantId) => {
    if (attendanceState[participantId]) return attendanceState[participantId];
    const record = currentAttendance.find((a) => a.participantId === participantId);
    return record?.status || 'ABSENT';
  };

  const onSaveAttendance = async () => {
    if (!currentSession) return;
    const finalAttendance = currentEnrolled.map((p) => ({
      participantId: p.id,
      status: getParticipantAttendance(p.id),
    }));
    try {
      await saveAttendance.mutateAsync({
        sessionId: currentSession.id,
        attendance: finalAttendance,
      });
      setNotice('Attendance roster saved.');
    } catch {
      // Error handled below
    }
  };

  const onSubmitCreateSession = async (e) => {
    e.preventDefault();
    try {
      const created = await createSession.mutateAsync(sessionForm);
      setNotice(`Bootcamp "${created.topic}" published.`);
      setShowCreateSession(false);
      setSessionForm(EMPTY_SESSION_FORM);
      setSelectedSessionId(created.id);
    } catch {
      // Error handled
    }
  };

  const onSubmitEnroll = async (e) => {
    e.preventDefault();
    if (!currentSession) return;
    try {
      await enrollParticipant.mutateAsync({
        sessionId: currentSession.id,
        participant: enrollForm,
      });
      setNotice(`Participant ${enrollForm.name} registered.`);
      setShowEnroll(false);
      setEnrollForm(EMPTY_ENROLL_FORM);
    } catch {
      // Error handled
    }
  };

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · WORKFLOW 6.4"
        title="Telecoms Bootcamps & Training"
        intro="Technical skilling sessions in IoT prototyping, wireless transmission, antenna tuning and soldering."
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateSession((prev) => !prev)}
        >
          <Plus size={15} />Create New Session
        </button>
      </PageHeading>

      <ErrorBanner
        error={
          bootcampsQuery.error ||
          createSession.error ||
          enrollParticipant.error ||
          saveAttendance.error
        }
        fallback="Could not complete bootcamp action."
      />

      {notice && <p className="tx-success">{notice}</p>}

      {showCreateSession && (
        <section className="live-panel" style={{ marginBottom: 16 }}>
          <h2 className="tx-panel-title">Publish Bootcamp Session (MM7 / TL8)</h2>
          <form className="tx-form" onSubmit={onSubmitCreateSession}>
            <div className="form-field">
              <label htmlFor="bc-topic">Session Topic *</label>
              <input
                id="bc-topic"
                type="text"
                required
                placeholder="e.g. 5G IoT Embedded Systems Hands-On Bootcamp"
                value={sessionForm.topic}
                onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
              />
            </div>
            <div className="tx-quote-row">
              <div className="form-field">
                <label htmlFor="bc-inst">Instructor *</label>
                <input
                  id="bc-inst"
                  type="text"
                  required
                  value={sessionForm.instructor}
                  onChange={(e) => setSessionForm({ ...sessionForm, instructor: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="bc-date">Date *</label>
                <input
                  id="bc-date"
                  type="date"
                  required
                  min={todayIso()}
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="tx-quote-row">
              <div className="form-field">
                <label htmlFor="bc-cap">Capacity (Seats) *</label>
                <input
                  id="bc-cap"
                  type="number"
                  min="5"
                  max="50"
                  required
                  value={sessionForm.capacity}
                  onChange={(e) => setSessionForm({ ...sessionForm, capacity: Number(e.target.value) })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="bc-fee">Fee (UGX)</label>
                <input
                  id="bc-fee"
                  type="number"
                  step="5000"
                  value={sessionForm.fee}
                  onChange={(e) => setSessionForm({ ...sessionForm, fee: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="tx-actions">
              <button className="btn btn-primary" type="submit" disabled={createSession.isPending}>
                {createSession.isPending ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}
                Publish Session
              </button>
              <button type="button" className="btn" onClick={() => setShowCreateSession(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {bootcampsQuery.isLoading ? (
        <Loading label="Loading bootcamp sessions…" />
      ) : (
        <div className="queue-grid">
          {/* Left Column: Sessions List */}
          <nav className="queue-list" aria-label="Available Bootcamps">
            {sessions.map((sess) => {
              const enrolledCount = sess.enrolled.length;
              const isFull = enrolledCount >= sess.capacity;
              const percentFilled = Math.min(100, Math.round((enrolledCount / sess.capacity) * 100));
              return (
                <button
                  key={sess.id}
                  type="button"
                  className={`queue-row ${sess.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => { setSelectedSessionId(sess.id); setNotice(''); }}
                >
                  <div className="queue-row-header">
                    <span className="queue-code-badge">{sess.id}</span>
                    <span className={`seat-badge ${isFull ? 'full' : 'open'}`}>
                      {isFull ? 'Full' : `${sess.capacity - enrolledCount} seats left`}
                    </span>
                  </div>

                  <b className="queue-row-title">{sess.topic}</b>

                  <div className="bootcamp-row-schedule">
                    <span className="schedule-pill">
                      <Calendar size={12} /> {formatDate(sess.date)}
                    </span>
                    <span className="schedule-pill">
                      <Clock size={12} /> {sess.start}–{sess.end}
                    </span>
                  </div>

                  <div className="bootcamp-row-meta">
                    <span><User size={12} /> {sess.instructor}</span>
                    <span className="bootcamp-fee-pill">{formatUgx(sess.fee)}</span>
                  </div>

                  <div className="seat-meter">
                    <div className="seat-meter-bar">
                      <div
                        className={`seat-meter-fill ${isFull ? 'full' : percentFilled > 75 ? 'warn' : 'good'}`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                    <div className="seat-meter-label">
                      <span><b>{enrolledCount}</b> of {sess.capacity} seats booked</span>
                      <span>{percentFilled}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Right Column: Active Session Participants & Attendance */}
          {currentSession ? (
            <section className="live-panel">
              <div className="live-panel-heading">
                <div>
                  <p className="eyebrow">{currentSession.id}</p>
                  <h2 className="tx-panel-title">{currentSession.topic}</h2>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={currentSession.enrolled.length >= currentSession.capacity}
                    onClick={() => setShowEnroll((prev) => !prev)}
                  >
                    <UserPlus size={14} />Register Participant
                  </button>
                </div>
              </div>

              {/* Session Overview Stats & Date Clarity */}
              <div className="bootcamp-overview-grid">
                <div className="bootcamp-stat-card">
                  <span className="stat-label">Training Date & Schedule</span>
                  <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0b3426' }}>
                    <Calendar size={16} /> {formatDate(currentSession.date)}
                  </span>
                  <span className="stat-sub">{currentSession.start} – {currentSession.end} ({currentSession.instructor})</span>
                </div>

                <div className="bootcamp-stat-card">
                  <span className="stat-label">Capacity & Booking</span>
                  <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={16} color="#0b3426" /> {currentSession.enrolled.length} / {currentSession.capacity}
                  </span>
                  <span className="stat-sub">
                    {currentSession.capacity - currentSession.enrolled.length > 0
                      ? `${currentSession.capacity - currentSession.enrolled.length} seats available`
                      : 'Fully booked'}
                  </span>
                </div>

                <div className="bootcamp-stat-card">
                  <span className="stat-label">Registration Fee</span>
                  <span className="stat-value" style={{ color: '#0b3426' }}>{formatUgx(currentSession.fee)}</span>
                  <span className="stat-sub">Per participant · Certificate included</span>
                </div>

                <div className="bootcamp-stat-card">
                  <span className="stat-label">Lab Venue</span>
                  <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={16} color="#0b3426" /> UniPod TL8
                  </span>
                  <span className="stat-sub">Telecoms & Embedded Systems Lab</span>
                </div>
              </div>

              {showEnroll && (
                <div style={{ background: '#f5f8f5', border: '1.5px solid #d4e5da', padding: 18, borderRadius: 16, marginBottom: 18 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#0b3426' }}>
                    Register Participant: {currentSession.topic}
                  </h4>
                  <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    Scheduled training on <b>{formatDate(currentSession.date)}</b> from <b>{currentSession.start} to {currentSession.end}</b>.
                  </p>
                  <form className="tx-form" onSubmit={onSubmitEnroll}>
                    <div className="form-field">
                      <label htmlFor="en-name">Full Name *</label>
                      <input
                        id="en-name"
                        required
                        type="text"
                        value={enrollForm.name}
                        onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                      />
                    </div>
                    <div className="tx-quote-row">
                      <div className="form-field">
                        <label htmlFor="en-email">Email Address *</label>
                        <input
                          id="en-email"
                          required
                          type="email"
                          value={enrollForm.email}
                          onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="en-num">Student Number (if Makerere)</label>
                        <input
                          id="en-num"
                          type="text"
                          placeholder="e.g. S24/1048"
                          value={enrollForm.studentNumber}
                          onChange={(e) => setEnrollForm({ ...enrollForm, studentNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="tx-actions">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={enrollParticipant.isPending}>
                        Confirm Enrollment
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setShowEnroll(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <h3 className="tx-subhead">
                Enrolled Participants & Attendance Sheet (MM9 / TL8)
              </h3>
              {currentEnrolled.length === 0 ? (
                <p className="live-empty">No participants registered yet for this bootcamp session.</p>
              ) : (
                <>
                  <div className="live-table-wrap" style={{ marginBottom: 16 }}>
                    <table className="live-table">
                      <thead>
                        <tr>
                          <th>Participant</th>
                          <th>Email / Student No</th>
                          <th>Payment Status</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentEnrolled.map((p) => {
                          const status = getParticipantAttendance(p.id);
                          return (
                            <tr key={p.id}>
                              <td><b>{p.name}</b></td>
                              <td>
                                {p.email}
                                {p.studentNumber && <small className="tx-muted"> · {p.studentNumber}</small>}
                              </td>
                              <td><PaymentStatus status={p.paymentStatus} /></td>
                              <td>
                                <div className="tx-actions">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${status === 'PRESENT' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => handleAttendanceToggle(p.id, 'PRESENT')}
                                  >
                                    <Check size={12} />Present
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${status === 'ABSENT' ? 'btn-danger' : 'btn-outline'}`}
                                    onClick={() => handleAttendanceToggle(p.id, 'ABSENT')}
                                  >
                                    <X size={12} />Absent
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saveAttendance.isPending}
                    onClick={onSaveAttendance}
                  >
                    {saveAttendance.isPending ? <LoaderCircle className="spin" size={14} /> : <CheckCircle2 size={14} />}
                    Save Attendance Roster
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className="live-panel"><p className="live-empty">Select a session.</p></section>
          )}
        </div>
      )}
    </div>
  );
}
