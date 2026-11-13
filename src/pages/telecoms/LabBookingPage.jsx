import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  Zap,
} from 'lucide-react';
import { addDays, findLabBookingClashes, isoWeekday, startOfWeek, todayIso } from '@/lib/telecoms';
import { useCreateLabBooking, useTelecomsLabBookings } from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading } from './shared';
import { useUnauthorizedRedirect } from './helpers';
import { CurvedSelect } from '@/components/CurvedSelect';

const EMPTY_FORM = {
  date: todayIso(),
  start: '09:00',
  end: '12:00',
  purpose: '',
  groupSize: '4',
  customerType: 'Student',
  bookedBy: 'Eng. Kaddu',
};

const TIME_PRESETS = [
  { label: 'Morning (09:00 – 12:00)', start: '09:00', end: '12:00', icon: Sunrise },
  { label: 'Afternoon (14:00 – 17:00)', start: '14:00', end: '17:00', icon: Sun },
  { label: 'Full Day (09:00 – 17:00)', start: '09:00', end: '17:00', icon: Zap },
];

function dayLabel(isoDate, options) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, options);
}

export function LabBookingPage({ token, onUnauthorized }) {
  const today = todayIso();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const weekEnd = addDays(weekStart, 6);
  const calendar = useTelecomsLabBookings(token, weekStart, weekEnd);
  const createBooking = useCreateLabBooking(token);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(null);
  useUnauthorizedRedirect(onUnauthorized, calendar.error, createBooking.error);

  const bookings = calendar.data?.bookings ?? [];
  const timetable = calendar.data?.timetable ?? [];
  const proposalInView = form.date >= weekStart && form.date <= weekEnd;

  const clashes = proposalInView && !calendar.isFetching
    ? findLabBookingClashes(form, { bookings, timetable })
    : [];

  const ready = form.date && form.start && form.end && form.purpose.trim() && proposalInView && !calendar.isFetching;

  const set = (field) => (event) => {
    const value = event.target.value;
    setConfirmed(null);
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'date' && value) setWeekStart(startOfWeek(value));
  };

  const applyPreset = (preset) => {
    setConfirmed(null);
    setForm((current) => ({
      ...current,
      start: preset.start,
      end: preset.end,
    }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!ready || clashes.length > 0) return;
    createBooking
      .mutateAsync({
        ...form,
        groupSize: Number(form.groupSize) || 1,
      })
      .then((saved) => {
        setConfirmed(saved);
        setForm(EMPTY_FORM);
      })
      .catch(() => {});
  };

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · WORKFLOW 6.2"
        title="Telecoms Lab Booking Desk"
        intro="Reserve bench stations, RF test spectrum analyzers and prototyping space in the Telecoms Lab without timetable clashes."
      />
      <ErrorBanner error={calendar.error || createBooking.error} fallback="Could not update lab booking calendar." />

      <div className="detail-grid">
        {/* Left Column: Weekly Calendar & Day Stream */}
        <div className="tx-stack">
          <section className="live-panel">
            <div className="tx-week-head">
              <div>
                <h2 className="tx-panel-title">
                  {weekStart === startOfWeek(today)
                    ? 'Current Week Schedule'
                    : `Week of ${dayLabel(weekStart, { day: 'numeric', month: 'short' })}`}
                </h2>
                <p className="tx-panel-subtitle">
                  {dayLabel(weekStart, { day: 'numeric', month: 'short' })} – {dayLabel(weekEnd, { day: 'numeric', month: 'short', year: 'numeric' })} · Lab hours: 08:00–18:00
                </p>
              </div>

              <div className="tx-week-nav">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Previous week"
                  title="Previous week"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setWeekStart(startOfWeek(today))}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Next week"
                  title="Next week"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="tx-calendar-legend">
              <span className="legend-item">
                <span className="legend-dot class" /> University Timetable (Reserved)
              </span>
              <span className="legend-item">
                <span className="legend-dot booking" /> Confirmed Lab Booking
              </span>
              <span className="legend-item">
                <span className="legend-dot open" /> Benches Open
              </span>
            </div>

            {calendar.isLoading ? (
              <Loading label="Loading lab schedule…" />
            ) : (
              <div className="tx-days">
                {days.map((day) => {
                  const isToday = day === today;
                  const isSelected = form.date === day;
                  const classes = timetable.filter((entry) => entry.weekday === isoWeekday(day));
                  const dayBookings = bookings
                    .filter((b) => b.date === day)
                    .sort((a, b) => a.start.localeCompare(b.start));
                  const hasItems = classes.length > 0 || dayBookings.length > 0;

                  return (
                    <div
                      key={day}
                      className={`tx-day-card ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="tx-day-header">
                        <div className="tx-day-date-badge">
                          <span className="tx-day-num">{dayLabel(day, { day: 'numeric' })}</span>
                          <span className="tx-day-name">{dayLabel(day, { weekday: 'short' })}</span>
                        </div>
                        {isToday && <span className="today-pill">TODAY</span>}
                        {isSelected && !isToday && <span className="selected-pill">SELECTED</span>}
                        <button
                          type="button"
                          className="tx-quick-book-btn"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, date: day }));
                            setConfirmed(null);
                          }}
                          title={`Select ${dayLabel(day, { weekday: 'long', month: 'short', day: 'numeric' })}`}
                        >
                          Select Day
                        </button>
                      </div>

                      <div className="tx-day-slots">
                        {classes.map((entry) => (
                          <div key={entry.id} className="tx-slot tx-slot-class">
                            <div className="tx-slot-content">
                              <div className="tx-slot-title-row">
                                <GraduationCap size={15} style={{ color: '#4f46e5' }} />
                                <b>{entry.label}</b>
                              </div>
                              <span className="tx-slot-time">
                                <Clock size={12} /> {entry.start} – {entry.end} · University Class Timetable
                              </span>
                            </div>
                            <span className="tx-slot-badge class-badge">Class</span>
                          </div>
                        ))}

                        {dayBookings.map((b) => (
                          <div key={b.id} className="tx-slot tx-slot-booking">
                            <div className="tx-slot-content">
                              <div className="tx-slot-title-row">
                                <CheckCircle2 size={15} style={{ color: '#059669' }} />
                                <b>{b.purpose}</b>
                              </div>
                              <span className="tx-slot-time">
                                <Clock size={12} /> {b.start} – {b.end} · {b.bookedBy} ({b.customerType})
                              </span>
                            </div>
                            <span className="tx-slot-badge booking-badge">Confirmed</span>
                          </div>
                        ))}

                        {!hasItems && (
                          <div
                            className="tx-slot tx-slot-open"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, date: day }));
                              setConfirmed(null);
                            }}
                            title="Click to select this date"
                          >
                            <Sparkles size={14} style={{ color: '#10b981' }} />
                            <span>Benches open all day (08:00 – 18:00) · <em>Click to book</em></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Lab reservation form (TL5) */}
        <div className="tx-stack">
          <section className="live-panel">
            <div style={{ marginBottom: 16 }}>
              <p className="eyebrow" style={{ color: 'var(--forest)' }}>LAB RESERVATION DESK (TL5)</p>
              <h2 className="tx-panel-title">Reserve Lab Benches</h2>
              <p className="tx-panel-subtitle">
                Book RF spectrum analyzers, signal generators, oscilloscope testing & rework benches.
              </p>
            </div>

            {confirmed && (
              <div className="tx-success" style={{ marginBottom: 14 }}>
                <CheckCircle2 size={16} />
                <span>
                  Booking confirmed! <b>{confirmed.purpose}</b> on {confirmed.date} ({confirmed.start}–{confirmed.end}).
                </span>
              </div>
            )}

            <form className="tx-form" onSubmit={onSubmit}>
              <div className="form-field">
                <label htmlFor="tl-book-date" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  Reservation Date *
                </label>
                <input
                  id="tl-book-date"
                  type="date"
                  required
                  min={todayIso()}
                  value={form.date}
                  onChange={set('date')}
                />
              </div>

              {/* Quick Time Preset Buttons */}
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
                  Quick Time Presets
                </label>
                <div className="tx-time-presets">
                  {TIME_PRESETS.map((preset) => {
                    const active = form.start === preset.start && form.end === preset.end;
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={`time-preset-chip ${active ? 'active' : ''}`}
                        onClick={() => applyPreset(preset)}
                      >
                        <Icon size={12} />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tx-quote-row">
                <div className="form-field">
                  <label htmlFor="tl-book-start" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    Start Time *
                  </label>
                  <input
                    id="tl-book-start"
                    type="time"
                    required
                    value={form.start}
                    onChange={set('start')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tl-book-end" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    End Time *
                  </label>
                  <input
                    id="tl-book-end"
                    type="time"
                    required
                    value={form.end}
                    onChange={set('end')}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tl-book-purpose" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  Purpose of Lab Session *
                </label>
                <input
                  id="tl-book-purpose"
                  type="text"
                  required
                  placeholder="e.g. LoRa antenna tuning, RF spectrum analysis & PCB rework"
                  value={form.purpose}
                  onChange={set('purpose')}
                />
              </div>

              <div className="tx-quote-row">
                <div className="form-field">
                  <label htmlFor="tl-book-groupsize" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    Group Size (People)
                  </label>
                  <input
                    id="tl-book-groupsize"
                    type="number"
                    min="1"
                    max="20"
                    value={form.groupSize}
                    onChange={set('groupSize')}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tl-book-type" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    User Group
                  </label>
                  <CurvedSelect
                    id="tl-book-type"
                    value={form.customerType}
                    options={[
                      { value: 'Student', label: 'Student Project' },
                      { value: 'Internal', label: 'Telecoms Staff / Researcher' },
                      { value: 'Company', label: 'External Commercial Partner' },
                      { value: 'Public', label: 'Innovator / Outsider' },
                    ]}
                    onChange={set('customerType')}
                  />
                </div>
              </div>

              {clashes.length > 0 && (
                <div className="tx-clash" role="alert">
                  <ShieldAlert size={18} style={{ flex: 'none', marginTop: 2 }} />
                  <div>
                    <b style={{ display: 'block', marginBottom: 2 }}>Schedule Conflict Detected:</b>
                    <ul>
                      {clashes.map((clash, idx) => (
                        <li key={idx}>{clash.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary tx-book-submit-btn"
                disabled={!ready || clashes.length > 0 || createBooking.isPending}
              >
                {createBooking.isPending ? <LoaderCircle className="spin" size={16} /> : <Clock size={16} />}
                Confirm Lab Booking
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
