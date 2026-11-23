import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useBookings, useCreateBooking, useFacilities, useTimetable } from '@/hooks/useBookings';
import { BLOCKING_BOOKING_STATUSES, rangesOverlap } from '@/services/bookings';
import { isCncFacility } from '@/services/cnc';
import { ErrorBanner, Loading, PageHeading, formatDate } from './shared';

const todayIso = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { facilityId: '', date: todayIso(), start: '09:00', end: '11:00', purpose: '', operator: '', attendees: '1' };

function toInstant(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function MachineBookingPage({ token }) {
  const facilitiesQuery = useFacilities(token);
  const createBooking = useCreateBooking(token);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(null);
  const [openedAt] = useState(() => new Date().toISOString());

  const machines = (facilitiesQuery.data ?? []).filter(isCncFacility);
  const facilityId = form.facilityId || machines.find((m) => m.status !== 'MAINTENANCE')?.id || '';
  const machine = machines.find((m) => m.id === facilityId);

  const dayBookings = useBookings(token, { date: form.date });
  const allBookings = useBookings(token);
  const validRange = form.date && form.start && form.end && form.end > form.start;
  const startsAt = validRange ? toInstant(form.date, form.start) : null;
  const endsAt = validRange ? toInstant(form.date, form.end) : null;
  const timetable = useTimetable(token, { facilityId, from: startsAt, to: endsAt }, Boolean(facilityId && validRange));

  const clashes = [];
  if (form.start && form.end && !validRange) clashes.push('The end time must be after the start time.');
  if (machine?.status === 'MAINTENANCE') clashes.push(`${machine.name} has a reported fault and cannot be booked.`);
  if (machine && Number(form.attendees) > machine.capacity) clashes.push(`${machine.name} holds at most ${machine.capacity} people.`);
  if (validRange) {
    for (const booking of dayBookings.data ?? []) {
      if (booking.facilityId === facilityId && BLOCKING_BOOKING_STATUSES.includes(booking.status)
        && rangesOverlap(startsAt, endsAt, booking.startsAt, booking.endsAt)) {
        clashes.push(`Already booked: ${booking.reference} "${booking.purpose}" (${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}).`);
      }
    }
    for (const block of timetable.data ?? []) {
      if (rangesOverlap(startsAt, endsAt, block.starts_at, block.ends_at)) {
        clashes.push(`A class is scheduled: "${block.title}" (${formatTime(block.starts_at)}–${formatTime(block.ends_at)}).`);
      }
    }
  }

  const ready = facilityId && validRange && form.purpose.trim() && form.operator.trim() && Number(form.attendees) >= 1;
  const upcoming = (allBookings.data ?? [])
    .filter((b) => !b.isEquipmentRequest && machines.some((m) => m.id === b.facilityId)
      && BLOCKING_BOOKING_STATUSES.includes(b.status) && b.endsAt >= openedAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  function set(field) {
    return (event) => {
      setConfirmed(null);
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function onSubmit(event) {
    event.preventDefault();
    if (!ready || clashes.length > 0) return;
    createBooking.mutate({
      facilityId,
      requestType: 'FACILITY',
      purpose: form.purpose.trim(),
      operator: form.operator.trim(),
      attendees: Number(form.attendees),
      startsAt,
      endsAt,
    }, {
      onSuccess: (saved) => {
        setConfirmed(saved);
        setForm({ ...EMPTY_FORM, facilityId });
      },
    });
  }

  return (
    <div className="live-page page-enter">
      <PageHeading title="Book a Machine" intro="Reserve machine time without clashing with other bookings or classes. Machines that need a safety pass can only be booked by people who passed the safety course." />
      <ErrorBanner error={facilitiesQuery.error || allBookings.error || createBooking.error} fallback="Could not book the machine." />

      <div className="detail-grid">
        <section className="live-panel tx-table-panel">
          <h3 className="tx-panel-title">Upcoming machine bookings</h3>
          {allBookings.isPending ? <Loading label="Loading bookings…" variant="table" /> : (
            <div className="live-table-wrap">
              <table className="live-table">
                <thead><tr><th>MACHINE</th><th>DATE</th><th>TIME</th><th>OPERATOR</th><th>STATUS</th></tr></thead>
                <tbody>
                  {upcoming.map((booking) => (
                    <tr key={booking.id} data-testid={`machine-booking-${booking.id}`}>
                      <td><b className="tx-strong">{booking.facilityName}</b> <small>{booking.purpose}</small></td>
                      <td>{formatDate(booking.startsAt)}</td>
                      <td>{formatTime(booking.startsAt)}–{formatTime(booking.endsAt)}</td>
                      <td>{booking.operator ?? '—'}</td>
                      <td>{booking.status === 'PENDING' ? 'Awaiting approval' : 'Approved'}</td>
                    </tr>
                  ))}
                  {upcoming.length === 0 && <tr><td colSpan={5} className="live-empty">No machine time booked yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="live-panel">
          <h3 className="tx-panel-title">Reserve a machine</h3>
          {confirmed && (
            <p className="tx-success">
              <CheckCircle2 size={15} />Requested {confirmed.reference}: {confirmed.facilityName} on {formatDate(confirmed.startsAt)} ({formatTime(confirmed.startsAt)}–{formatTime(confirmed.endsAt)}). It is waiting for approval.
            </p>
          )}
          <form className="tx-form" onSubmit={onSubmit}>
            <div className="form-field">
              <label htmlFor="cnc-machine">Machine*</label>
              <select id="cnc-machine" value={facilityId} onChange={set('facilityId')} disabled={facilitiesQuery.isPending}>
                {facilitiesQuery.isPending && <option value="">Loading machines…</option>}
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.status === 'MAINTENANCE' ? ' (fault reported)' : ''}{m.requiresSafetyPass ? ' · safety pass required' : ''}</option>
                ))}
              </select>
            </div>
            {machine?.requiresSafetyPass && (
              <p className="live-note">This machine needs a passed safety course. <Link to="/cnc/safety">See safety courses</Link>.</p>
            )}
            <div className="form-field">
              <label htmlFor="cnc-date">Date*</label>
              <input id="cnc-date" type="date" min={todayIso()} value={form.date} onChange={set('date')} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="cnc-start">Start time*</label>
                <input id="cnc-start" type="time" value={form.start} onChange={set('start')} />
              </div>
              <div className="form-field">
                <label htmlFor="cnc-end">End time*</label>
                <input id="cnc-end" type="time" value={form.end} onChange={set('end')} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="cnc-purpose">Purpose*</label>
              <input id="cnc-purpose" value={form.purpose} onChange={set('purpose')} placeholder="e.g. ORD-CNC-2026-000012 cutting" />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="cnc-operator">Operator*</label>
                <input id="cnc-operator" value={form.operator} onChange={set('operator')} />
              </div>
              <div className="form-field">
                <label htmlFor="cnc-people">People</label>
                <input id="cnc-people" type="number" min="1" value={form.attendees} onChange={set('attendees')} />
              </div>
            </div>

            {clashes.length > 0 && (
              <div className="tx-clash" role="alert">
                <ShieldAlert size={16} />
                <div><b>Cannot book:</b><ul>{clashes.map((clash) => <li key={clash}>{clash}</li>)}</ul></div>
              </div>
            )}

            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={!ready || clashes.length > 0 || createBooking.isPending}>
                {createBooking.isPending ? <LoaderCircle className="spin" size={15} /> : <Clock size={15} />}Request booking
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
