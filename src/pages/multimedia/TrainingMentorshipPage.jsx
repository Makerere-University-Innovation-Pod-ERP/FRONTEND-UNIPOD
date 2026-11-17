import React, { useState } from 'react';
import { GraduationCap, User, Activity, X, Calendar, MapPin, Users } from 'lucide-react';
import { useTrainingOverview, useMarkAttendance } from '@/hooks/useTraining';

export function TrainingMentorshipPage({ token }) {
  const { data: overview } = useTrainingOverview(token);
  const markAttendanceMutation = useMarkAttendance(token);
  const [selectedSession, setSelectedSession] = useState(null);

  const upcomingCount = overview?.upcomingSessions ?? 4;
  const seatsFilledCount = overview?.seatsFilled ?? 63;
  const totalSeatsCount = overview?.totalSeats ?? 79;
  const mentorshipCount = overview?.mentorshipFollowUps ?? 8;

  const sessions = overview?.sessions ?? [
    {
      id: 'ts-1',
      title: 'Intro to CNC Safety',
      facilitator: 'Robinson Mugisha',
      date: '29 Oct · 09:00',
      enrolledCount: 14,
      capacity: 18,
      location: 'Makerspace Lab 2',
      description: 'Mandatory workshop covering workshop hazard containment, emergency stops, and eye-protection protocols for student fabricators.',
      roster: [
        { name: 'Kato Ivan', studentId: '22/U/1042', status: 'Present' },
        { name: 'Namubiru Claire', studentId: '23/U/3412', status: 'Present' },
        { name: 'Okello Ronald', studentId: '21/U/8904', status: 'Present' },
        { name: 'Achieng Brenda', studentId: '22/U/5120', status: 'Excused' },
      ],
    },
    {
      id: 'ts-2',
      title: 'Telecom Systems Bootcamp',
      facilitator: 'Faith NamuyanJa',
      date: '3 Nov · 09:00',
      enrolledCount: 22,
      capacity: 25,
      location: 'Electronics & RF Bench',
      description: 'Hands-on RF spectrum analysis, antenna tuning, and SDR interfacing for wireless hardware prototypes.',
      roster: [
        { name: 'Lwanga Brian', studentId: '21/U/6619', status: 'Present' },
        { name: 'Babirye Sarah', studentId: '22/U/4001', status: 'Present' },
        { name: 'Mugisha Emmanuel', studentId: '23/U/7102', status: 'Present' },
      ],
    },
    {
      id: 'ts-3',
      title: 'Startup Pitch Clinic',
      facilitator: 'Grace Namuli',
      date: '30 Oct · 10:00',
      enrolledCount: 11,
      capacity: 20,
      location: 'Innovation Pod Boardroom',
      description: 'Investor readiness, pitch slide deck structure, and financial projection reviews ahead of Demo Day.',
      roster: [
        { name: 'Kavuma Derrick', studentId: '20/U/1944', status: 'Present' },
        { name: 'Nabukeera Diana', studentId: '22/U/3321', status: 'Present' },
      ],
    },
    {
      id: 'ts-4',
      title: 'Media Production Fundamentals',
      facilitator: 'Katia Birungi',
      date: '5 Nov · 13:00',
      enrolledCount: 16,
      capacity: 16,
      location: 'Multimedia Studio 1',
      description: 'Multi-camera setup, podcast audio capture, and basic lighting for project documentary and promotional releases.',
      roster: [
        { name: 'Kyomugisha Fiona', studentId: '22/U/8812', status: 'Present' },
        { name: 'Mukasa Paul', studentId: '23/U/2209', status: 'Present' },
      ],
    },
  ];

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Training & Mentorship</h1>
          <p>Published sessions, registration capacity and mentorship follow-ups.</p>
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
              <div className="ops-modal-fact"><MapPin size={14} color="var(--muted)" /><span><strong>Location:</strong> {selectedSession.location || 'Innovation Hub Lab'}</span></div>
              <div className="ops-modal-fact"><Users size={14} color="var(--muted)" /><span><strong>Enrolled:</strong> {selectedSession.enrolledCount} of {selectedSession.capacity} seats filled</span></div>
            </div>

            {selectedSession.description && <p className="ops-modal-desc">{selectedSession.description}</p>}

            {selectedSession.roster && selectedSession.roster.length > 0 && (
              <div>
                <div className="ops-roster-head"><b>Participant Roster</b><span>{selectedSession.roster.length} recorded</span></div>
                <div className="ops-roster">
                  {selectedSession.roster.map((student, idx) => (
                    <div key={idx} className="ops-roster-row">
                      <div><strong>{student.name}</strong><small>{student.studentId}</small></div>
                      <button
                        type="button"
                        className={`partner-status ${student.status === 'Present' ? 'active' : 'renewal-due'}`}
                        title="Click to toggle attendance"
                        onClick={async () => {
                          const nextStatus = student.status === 'Present' ? 'Absent' : 'Present';
                          try {
                            await markAttendanceMutation.mutateAsync({
                              sessionId: selectedSession.id,
                              participantId: student.id || student.studentId,
                              attendance: nextStatus,
                            });
                            setSelectedSession((prev) => {
                              if (!prev) return prev;
                              const updatedRoster = (prev.roster || []).map((r, i) =>
                                i === idx ? { ...r, status: nextStatus } : r,
                              );
                              return { ...prev, roster: updatedRoster };
                            });
                          } catch (e) {
                            console.warn('Attendance update failed:', e);
                          }
                        }}
                      >
                        {student.status}
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
    </div>
  );
}
