import { useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, Lock, TriangleAlert, UserPlus, Users } from 'lucide-react';
import {
  MACHINE_UNAVAILABLE_REASON, addDays, findBookingClashes, isMachineBookable, isoWeekday, startOfWeek, toIsoDate,
} from '@/lib/textile';
import { useAddAttendee, useBookings, useCreateBooking, useMachines, useSetAttendance } from '@/hooks/useTextile';
import { ErrorBanner, Loading, PageHeading, StatusDot } from './shared';
import { useUnauthorizedRedirect } from './helpers';

const EMPTY_FORM = { kind: 'WORKSHOP', date: '', start: '14:00', end: '17:00', purpose: '', machineId: '', capacity: '12' };

function dayLabel(isoDate, options) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, options);
}

export function WorkshopBookingPage({ token, onUnauthorized }) {
  const today = toIsoDate(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const weekEnd = addDays(weekStart, 6);
  const calendar = useBookings(token, weekStart, weekEnd);
  const machines = useMachines(token);
  const createBooking = useCreateBooking(token);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  useUnauthorizedRedirect(onUnauthorized, calendar.error, machines.error, createBooking.error);

  const bookings = calendar.data?.bookings ?? [];
  const timetable = calendar.data?.timetable ?? [];
  const machineList = machines.data ?? [];
  const proposalInView = form.date >= weekStart && form.date <= weekEnd;
  const clashes = proposalInView && !calendar.isFetching
    ? findBookingClashes({ ...form, machineId: form.machineId || null }, { bookings, timetable, machines: machineList })
    : [];
  const ready = form.date && form.start && form.end && form.purpose.trim() && proposalInView && !calendar.isFetching;
  const selected = bookings.find((booking) => booking.id === selectedId && booking.kind === 'TRAINING');

  const set = (field) => (event) => {
    const value = event.target.value;
    setConfirmed(null);
    setForm((current) => ({ ...current, [field]: value }));
    // Follow the chosen date so the clash check always runs against that week's bookings.
    if (field === 'date' && value) setWeekStart(startOfWeek(value));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!ready || clashes.length) return;
    createBooking.mutateAsync({
      kind: form.kind,
      date: form.date,
      start: form.start,
      end: form.end,
      purpose: form.purpose.trim(),
      machineId: form.machineId || null,
      capacity: form.kind === 'TRAINING' ? Number(form.capacity) || null : null,
    }).then((booking) => {
      setConfirmed(booking);
      setForm(EMPTY_FORM);
      if (booking.kind === 'TRAINING') setSelectedId(booking.id);
    }).catch(() => {});
  };

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE · BOOKINGS" title="Book the Workshop" intro="Reserve workshop time or a pattern-cutting training session." />
      <ErrorBanner error={calendar.error} fallback="Could not load the booking calendar." />
      <div className="detail-grid">
        <div className="tx-stack">
          <section className="live-panel">
            <div className="tx-week-head">
              <h2 className="tx-panel-title">{weekStart === startOfWeek(today) ? 'This week' : `Week of ${dayLabel(weekStart, { day: 'numeric', month: 'short' })}`}</h2>
              <div className="tx-week-nav">
                <button type="button" className="icon-button" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={15} /></button>
                <button type="button" className="btn" onClick={() => setWeekStart(startOfWeek(today))}>Today</button>
                <button type="button" className="icon-button" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={15} /></button>
              </div>
            </div>
            {calendar.isLoading ? <Loading label="Loading calendar…" /> : (
              <ol className="tx-days">
                {days.map((day) => {
                  const classes = timetable.filter((entry) => entry.weekday === isoWeekday(day));
                  const dayBookings = bookings.filter((booking) => booking.date === day).sort((a, b) => a.start.localeCompare(b.start));
                  const empty = !classes.length && !dayBookings.length;
                  return (
                    <li key={day} className={`tx-day ${day === today ? 'today' : ''}`}>
                      <span className="tx-day-date"><b>{dayLabel(day, { day: '2-digit' })}</b><small>{dayLabel(day, { weekday: 'short' })}</small></span>
                      <div className="tx-day-items">
                        {classes.map((entry) => (
                          <div key={entry.id} className="tx-slot class">
                            <span><b>{entry.label}</b><small>{entry.start}–{entry.end} · class timetable</small></span>
                            <StatusDot tone="neutral">Class</StatusDot>
                          </div>
                        ))}
                        {dayBookings.map((booking) => {
                          const machine = machineList.find((candidate) => candidate.id === booking.machineId);
                          const content = (
                            <>
                              <span>
                                <b>{booking.purpose} · {booking.bookedBy}</b>
                                <small>
                                  {booking.start}–{booking.end}
                                  {machine ? ` · ${machine.name}` : ''}
                                  {booking.kind === 'TRAINING' ? ` · ${booking.attendees.length}${booking.capacity ? `/${booking.capacity}` : ''} signed up` : ''}
                                </small>
                              </span>
                              <StatusDot tone={booking.status === 'APPROVED' ? 'positive' : 'attention'}>{booking.kind === 'TRAINING' ? 'Training' : 'Approved'}</StatusDot>
                            </>
                          );
                          return booking.kind === 'TRAINING' ? (
                            <button key={booking.id} type="button" className={`tx-slot booking ${selectedId === booking.id ? 'active' : ''}`}
                              aria-pressed={selectedId === booking.id} onClick={() => setSelectedId(booking.id)}>{content}</button>
                          ) : <div key={booking.id} className="tx-slot booking">{content}</div>;
                        })}
                        {empty && <div className="tx-slot free"><span><b>Open workshop slot</b><small>Class timetable clear</small></span><StatusDot tone="positive">Free</StatusDot></div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          {selected && <AttendancePanel key={selected.id} token={token} booking={selected} onUnauthorized={onUnauthorized} />}
        </div>

        <form className="live-panel tx-form" onSubmit={onSubmit}>
          <h2 className="tx-panel-title">New booking</h2>
          <div className="tx-segments" role="radiogroup" aria-label="Booking type">
            {[['WORKSHOP', 'Workshop time'], ['TRAINING', 'Training session']].map(([value, label]) => (
              <label key={value} className={`tx-segment ${form.kind === value ? 'selected' : ''}`}>
                <input type="radio" name="booking-kind" value={value} checked={form.kind === value} onChange={set('kind')} />
                <i aria-hidden="true" />{label}
              </label>
            ))}
          </div>
          <label className="form-field">Date*<input type="date" required min={today} value={form.date} onChange={set('date')} /></label>
          <div className="form-grid">
            <label className="form-field">Start*<input type="time" required step="900" value={form.start} onChange={set('start')} /></label>
            <label className="form-field">End*<input type="time" required step="900" value={form.end} onChange={set('end')} /></label>
          </div>
          <label className="form-field">Purpose*
            <input required maxLength={200} value={form.purpose} onChange={set('purpose')}
              placeholder={form.kind === 'TRAINING' ? 'e.g. Pattern-cutting class' : 'e.g. Student pattern-cutting practice'} />
          </label>
          <label className="form-field">Machine
            <select value={form.machineId} onChange={set('machineId')}>
              <option value="">No specific machine</option>
              {machineList.map((machine) => (
                <option key={machine.id} value={machine.id} disabled={!isMachineBookable(machine)}>
                  {machine.name}{isMachineBookable(machine) ? '' : ' — unavailable'}
                </option>
              ))}
            </select>
            {machineList.some((machine) => !isMachineBookable(machine)) && <span className="field-note">{MACHINE_UNAVAILABLE_REASON}</span>}
          </label>
          {form.kind === 'TRAINING' && (
            <label className="form-field">Places<input type="number" min="1" max="60" value={form.capacity} onChange={set('capacity')} /></label>
          )}
          {clashes.length > 0 && (
            <div className="tx-clash" role="alert">
              <TriangleAlert size={15} />
              <ul>{clashes.map((clash) => <li key={clash.message}>{clash.message}</li>)}</ul>
            </div>
          )}
          <ErrorBanner error={createBooking.error} fallback="Could not confirm the booking." />
          {confirmed && <p className="tx-success" role="status">Booked: {confirmed.purpose}, {dayLabel(confirmed.date, { weekday: 'short', day: 'numeric', month: 'short' })} {confirmed.start}–{confirmed.end}.</p>}
          <button type="submit" className="btn btn-primary tx-block" disabled={!ready || clashes.length > 0 || createBooking.isPending}>
            {createBooking.isPending ? <LoaderCircle size={15} className="spin" /> : null}Confirm
          </button>
          <p className="tx-lock-note"><Lock size={12} />Blocked automatically if it clashes with the class timetable or another booking.</p>
        </form>
      </div>
    </div>
  );
}

function AttendancePanel({ token, booking, onUnauthorized }) {
  const [name, setName] = useState('');
  const addAttendee = useAddAttendee(token);
  const setAttendance = useSetAttendance(token);
  useUnauthorizedRedirect(onUnauthorized, addAttendee.error, setAttendance.error);
  const full = booking.capacity !== null && booking.attendees.length >= booking.capacity;
  const attended = booking.attendees.filter((attendee) => attendee.attended).length;

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div><p className="eyebrow">TRAINING · SIGN-UP & ATTENDANCE</p><h2>{booking.purpose}</h2></div>
        <span className="tx-count"><Users size={13} />{booking.attendees.length}{booking.capacity ? `/${booking.capacity}` : ''} signed up · {attended} attended</span>
      </div>
      {booking.attendees.length === 0 && <p className="live-empty">No one has signed up yet.</p>}
      <ul className="tx-checklist">
        {booking.attendees.map((attendee) => (
          <li key={attendee.id}>
            <label className="tx-check">
              <input type="checkbox" checked={attendee.attended} disabled={setAttendance.isPending}
                onChange={(event) => setAttendance.mutateAsync({ bookingId: booking.id, attendeeId: attendee.id, attended: event.target.checked }).catch(() => {})} />
              <span>{attendee.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <form className="tx-min-form tx-signup" onSubmit={(event) => {
        event.preventDefault();
        addAttendee.mutateAsync({ bookingId: booking.id, name: name.trim() }).then(() => setName('')).catch(() => {});
      }}>
        <input aria-label="Participant name" value={name} onChange={(event) => setName(event.target.value)} placeholder={full ? 'Session is full' : 'Participant name'} disabled={full} />
        <button type="submit" className="btn" disabled={full || !name.trim() || addAttendee.isPending}><UserPlus size={13} />Sign up</button>
      </form>
      <ErrorBanner error={addAttendee.error || setAttendance.error} fallback="Could not update attendance." />
    </section>
  );
}
