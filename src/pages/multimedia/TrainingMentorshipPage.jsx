import { GraduationCap, User, Activity } from 'lucide-react';
import { useTrainingOverview } from '@/hooks/useTraining';

export function TrainingMentorshipPage({ token }) {
  const { data: overview, isLoading } = useTrainingOverview(token);

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
    },
    {
      id: 'ts-2',
      title: 'Telecom Systems Bootcamp',
      facilitator: 'Faith NamuyanJa',
      date: '3 Nov · 09:00',
      enrolledCount: 22,
      capacity: 25,
    },
    {
      id: 'ts-3',
      title: 'Startup Pitch Clinic',
      facilitator: 'Grace Namuli',
      date: '30 Oct · 10:00',
      enrolledCount: 11,
      capacity: 20,
    },
    {
      id: 'ts-4',
      title: 'Media Production Fundamentals',
      facilitator: 'Katia Birungi',
      date: '5 Nov · 13:00',
      enrolledCount: 16,
      capacity: 16,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '10px 0' }}>
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
            fontSize: '9px',
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
            fontSize: '34px',
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
            fontSize: '12px',
            color: '#7a847b',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Published sessions, registration capacity and mentorship follow-ups.
        </p>
      </div>

      {/* 3 KPI Metric Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '26px',
        }}
      >
        {/* Card 1: UPCOMING SESSIONS */}
        <article
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e3e7df',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
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
        <article
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e3e7df',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
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
        <article
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e3e7df',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
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

      {/* Sessions Data Table Container */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e3e7df',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e8eae3' }}>
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
                    width: '25%',
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
                    width: '20%',
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
                    width: '20%',
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
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid #eff0eb',
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
    </div>
  );
}

