import React, { useState } from 'react';
import { GraduationCap, User, Activity, X, Calendar, MapPin, Users } from 'lucide-react';
import { useTrainingOverview } from '@/hooks/useTraining';

export function TrainingMentorshipPage({ token }) {
  const { data: overview, isLoading } = useTrainingOverview(token);
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

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 0' }}>
        <p style={{ color: '#7a847b', fontSize: '13px' }}>Loading Training & Mentorship…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Eyebrow & Title Area */}
      <div style={{ marginBottom: '28px' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: '#1b5e43',
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
          }}
        >
          OPERATIONS
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 3.5vw, 34px)',
            lineHeight: 1.15,
            fontWeight: 600,
            color: '#16221a',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
          }}
        >
          Training & Mentorship
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#7a847b',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Published sessions, registration capacity and mentorship follow-ups.
        </p>
      </div>

      {/* 3 KPI Metric Cards with 16px corner radius */}
      <section className="training-overview-grid" aria-label="Training KPI metrics">
        {/* Card 1: UPCOMING SESSIONS */}
        <article className="training-metric-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#7a847b',
                textTransform: 'uppercase',
              }}
            >
              UPCOMING SESSIONS
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#eef5eb',
                color: '#1b5e43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={15} />
            </div>
          </div>
          <strong
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: '#16221a',
              display: 'block',
              lineHeight: 1,
            }}
          >
            {upcomingCount}
          </strong>
        </article>

        {/* Card 2: SEATS FILLED */}
        <article className="training-metric-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#7a847b',
                textTransform: 'uppercase',
              }}
            >
              SEATS FILLED
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#eef5eb',
                color: '#1b5e43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={15} />
            </div>
          </div>
          <strong
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: '#16221a',
              display: 'block',
              lineHeight: 1,
            }}
          >
            {seatsFilledCount}/{totalSeatsCount}
          </strong>
        </article>

        {/* Card 3: MENTORSHIP FOLLOW-UPS */}
        <article className="training-metric-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#7a847b',
                textTransform: 'uppercase',
              }}
            >
              MENTORSHIP FOLLOW-UPS
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#eef5eb',
                color: '#1b5e43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Activity size={15} />
            </div>
          </div>
          <strong
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: '#16221a',
              display: 'block',
              lineHeight: 1,
            }}
          >
            {mentorshipCount}
          </strong>
        </article>
      </section>

      {/* Sessions Data Table Container with 16px corner radius and overflow hidden */}
      <section className="training-table-container">
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              minWidth: '640px',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #eef0eb' }}>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '35%',
                  }}
                >
                  SESSION
                </th>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '28%',
                  }}
                >
                  FACILITATOR
                </th>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '22%',
                  }}
                >
                  DATE
                </th>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '15%',
                  }}
                >
                  ENROLLED
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => {
                const isLast = index === sessions.length - 1;
                return (
                  <tr
                    key={session.id}
                    data-testid={`session-row-${session.id}`}
                    onClick={() => setSelectedSession(session)}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid #eff0eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fafbfa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#16221a',
                      }}
                    >
                      {session.title}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '12px',
                        color: '#7a847b',
                      }}
                    >
                      {session.facilitator}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '12px',
                        color: '#7a847b',
                      }}
                    >
                      {session.date}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '12px',
                        color: '#7a847b',
                      }}
                    >
                      {session.enrolledCount}/{session.capacity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Session Inspection Modal */}
      {selectedSession && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#1b5e43',
                    marginBottom: '4px',
                    letterSpacing: '0.08em',
                  }}
                >
                  Training Session Details
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '22px',
                    fontWeight: 600,
                    margin: 0,
                    color: '#16221a',
                  }}
                >
                  {selectedSession.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                style={{
                  border: 'none',
                  background: '#f2f4ee',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#414842',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                background: '#fafbfa',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #eef0eb',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <User size={14} color="#7a847b" />
                <span>
                  <strong>Facilitator:</strong> {selectedSession.facilitator}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <Calendar size={14} color="#7a847b" />
                <span>
                  <strong>Date & Time:</strong> {selectedSession.date}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <MapPin size={14} color="#7a847b" />
                <span>
                  <strong>Location:</strong> {selectedSession.location || 'Innovation Hub Lab'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <Users size={14} color="#7a847b" />
                <span>
                  <strong>Enrolled:</strong> {selectedSession.enrolledCount} of {selectedSession.capacity} seats filled
                </span>
              </div>
            </div>

            {selectedSession.description && (
              <p style={{ fontSize: '12px', color: '#555e56', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {selectedSession.description}
              </p>
            )}

            {selectedSession.roster && selectedSession.roster.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <b style={{ fontSize: '11px', color: '#16221a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Participant Roster
                  </b>
                  <span style={{ fontSize: '11px', color: '#7a847b' }}>
                    {selectedSession.roster.length} recorded
                  </span>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #eef0eb', borderRadius: '8px' }}>
                  {selectedSession.roster.map((student, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: idx === selectedSession.roster.length - 1 ? 'none' : '1px solid #f2f4ef',
                        fontSize: '11px',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#16221a', display: 'block' }}>{student.name}</strong>
                        <small style={{ color: '#7a847b' }}>{student.studentId}</small>
                      </div>
                      <span
                        style={{
                          background: student.status === 'Present' ? '#e3f0e6' : '#fff4da',
                          color: student.status === 'Present' ? '#215f43' : '#b46a24',
                          borderRadius: '9999px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {student.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                style={{
                  background: '#1b5e43',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
