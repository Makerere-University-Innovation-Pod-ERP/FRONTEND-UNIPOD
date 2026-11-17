import { useState } from 'react';
import { GraduationCap, Plus, User, Activity, X, Calendar, MapPin, Users } from 'lucide-react';
import { useTrainingOverview, useMarkAttendance, useCreateSession } from '@/hooks/useTraining';

const NEW_SESSION_DEFAULTS = { title: '', facilitator: '', date: '', venue: '', capacity: '' };

export function TrainingMentorshipPage({ token }) {
  const { data: overview } = useTrainingOverview(token);
  const markAttendanceMutation = useMarkAttendance(token);
  const createSessionMutation = useCreateSession(token);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState(NEW_SESSION_DEFAULTS);
  const [createError, setCreateError] = useState('');

  const upcomingCount = overview?.upcomingSessions ?? 0;
  const seatsFilledCount = overview?.seatsFilled ?? 0;
  const totalSeatsCount = overview?.totalSeats ?? 0;
  const mentorshipCount = overview?.mentorshipFollowUps ?? 0;

  const sessions = overview?.sessions ?? [];

  async function submitNewSession(event) {
    event.preventDefault();
    setCreateError('');
    if (!newSession.title.trim() || !newSession.facilitator.trim() || !newSession.date.trim() || !newSession.venue.trim()) {
      setCreateError('Title, facilitator, date and venue are all required.');
      return;
    }
    try {
      await createSessionMutation.mutateAsync({
        title: newSession.title.trim(),
        facilitator: newSession.facilitator.trim(),
        date: newSession.date.trim(),
        venue: newSession.venue.trim(),
        capacity: Number(newSession.capacity) || 0,
        description: '',
      });
      setNewSession(NEW_SESSION_DEFAULTS);
      setShowCreateForm(false);
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Could not create the session.');
    }
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Training & Mentorship</h1>
          <p>Published sessions, registration capacity and mentorship follow-ups.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            <Plus size={15} />New session
          </button>
        </div>
      </div>

      <section className="live-metrics tx-metrics" aria-label="Training KPI metrics">
        <article className="live-metric"><p>UPCOMING SESSIONS <GraduationCap size={14} /></p><strong>{upcomingCount}</strong></article>
        <article className="live-metric"><p>SEATS FILLED <User size={14} /></p><strong>{seatsFilledCount}/{totalSeatsCount}</strong></article>
        <article className="live-metric"><p>MENTORSHIP FOLLOW-UPS <Activity size={14} /></p><strong>{mentorshipCount}</strong></article>
      </section>

      <section className="live-panel tx-table-panel">
        <div className="live-table-wrap">
          <table className="live-table">
            <thead>
              <tr>
                <th>SESSION</th>
                <th>FACILITATOR</th>
                <th>DATE</th>
                <th>ENROLLED</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} data-testid={`session-row-${session.id}`} onClick={() => setSelectedSession(session)}>
                  <td><b className="tx-strong">{session.title}</b></td>
                  <td>{session.facilitator}</td>
                  <td>{session.date}</td>
                  <td>{session.enrolledCount}/{session.capacity}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={4} className="live-empty">No training sessions published yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSession && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Training Session Details</span>
                <h3>{selectedSession.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSession(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Facilitator:</strong> {selectedSession.facilitator}</span></div>
              <div className="ops-modal-fact"><Calendar size={14} color="var(--muted)" /><span><strong>Date & Time:</strong> {selectedSession.date}</span></div>
              <div className="ops-modal-fact"><MapPin size={14} color="var(--muted)" /><span><strong>Venue:</strong> {selectedSession.venue || 'Innovation Hub Lab'}</span></div>
              <div className="ops-modal-fact"><Users size={14} color="var(--muted)" /><span><strong>Enrolled:</strong> {selectedSession.enrolledCount} of {selectedSession.capacity} seats filled</span></div>
            </div>

            {selectedSession.description && <p className="ops-modal-desc">{selectedSession.description}</p>}

            {selectedSession.participants && selectedSession.participants.length > 0 && (
              <div>
                <div className="ops-roster-head"><b>Participant Roster</b><span>{selectedSession.participants.length} recorded</span></div>
                <div className="ops-roster">
                  {selectedSession.participants.map((participant) => (
                    <div key={participant.id} className="ops-roster-row">
                      <div><strong>{participant.name}</strong><small>{participant.regNumber}</small></div>
                      <button
                        type="button"
                        className={`partner-status ${participant.attendance === 'Present' ? 'active' : 'renewal-due'}`}
                        title="Click to toggle attendance"
                        onClick={async () => {
                          const nextAttendance = participant.attendance === 'Present' ? 'Absent' : 'Present';
                          try {
                            await markAttendanceMutation.mutateAsync({
                              sessionId: selectedSession.id,
                              participantId: participant.id,
                              attendance: nextAttendance,
                            });
                            setSelectedSession((prev) => {
                              if (!prev) return prev;
                              const updatedParticipants = (prev.participants || []).map((p) =>
                                p.id === participant.id ? { ...p, attendance: nextAttendance } : p,
                              );
                              return { ...prev, participants: updatedParticipants };
                            });
                          } catch {
                            // The mutation's own error state is enough here; markAttendanceMutation.isError
                            // could surface a banner if this flow grows a retry affordance.
                          }
                        }}
                      >
                        {participant.attendance}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ops-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setSelectedSession(null)}>Done</button>
            </div>
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

            <form className="tx-form" onSubmit={submitNewSession}>
              <div className="tx-field">
                <label className="tx-label" htmlFor="new-session-title">Title</label>
                <input
                  id="new-session-title"
                  value={newSession.title}
                  onChange={(event) => setNewSession((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>
              <div className="tx-field">
                <label className="tx-label" htmlFor="new-session-facilitator">Facilitator</label>
                <input
                  id="new-session-facilitator"
                  value={newSession.facilitator}
                  onChange={(event) => setNewSession((prev) => ({ ...prev, facilitator: event.target.value }))}
                />
              </div>
              <div className="tx-field">
                <label className="tx-label" htmlFor="new-session-date">Date & time</label>
                <input
                  id="new-session-date"
                  placeholder="e.g. 12 Nov · 09:00"
                  value={newSession.date}
                  onChange={(event) => setNewSession((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div className="tx-field">
                <label className="tx-label" htmlFor="new-session-venue">Venue</label>
                <input
                  id="new-session-venue"
                  value={newSession.venue}
                  onChange={(event) => setNewSession((prev) => ({ ...prev, venue: event.target.value }))}
                />
              </div>
              <div className="tx-field">
                <label className="tx-label" htmlFor="new-session-capacity">Capacity</label>
                <input
                  id="new-session-capacity"
                  type="number"
                  min="0"
                  value={newSession.capacity}
                  onChange={(event) => setNewSession((prev) => ({ ...prev, capacity: event.target.value }))}
                />
              </div>
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
