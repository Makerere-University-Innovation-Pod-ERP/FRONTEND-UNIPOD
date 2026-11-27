import { useState } from 'react';
import { CheckCircle2, Clock, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useBookings, useCreateBooking, useFacilities, useTimetable } from '@/hooks/useBookings';
import { BLOCKING_BOOKING_STATUSES, rangesOverlap } from '@/services/bookings';
import { ErrorBanner, Loading } from './shared';

const todayIso = () => new Date().toISOString().slice(0, 10);
const STUDIO_PATTERN = /podcast|studio|booth/i;

const EMPTY_FORM = {
  facilityId: '',
  date: todayIso(),
  start: '10:00',
  end: '11:00',
  showName: '',
  participants: '',
  producer: '',
};

function toInstant(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PodcastBookingPage({ token }) {
  const facilitiesQuery = useFacilities(token);
  const createBooking = useCreateBooking(token);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(null);
  const [pageOpenedAt] = useState(() => new Date().toISOString());

  const facilities = facilitiesQuery.data ?? [];
  const studios = facilities.filter((facility) => STUDIO_PATTERN.test(facility.name));
  const studioOptions = studios.length > 0 ? studios : facilities;
  const facilityId = form.facilityId || studioOptions[0]?.id || '';
  const studio = facilities.find((facility) => facility.id === facilityId);

  const dayBookingsQuery = useBookings(token, { date: form.date });
  const upcomingQuery = useBookings(token);
  const validRange = form.date && form.start && form.end && form.end > form.start;
  const startsAt = validRange ? toInstant(form.date, form.start) : null;
  const endsAt = validRange ? toInstant(form.date, form.end) : null;
  const timetableQuery = useTimetable(token, { facilityId, from: startsAt, to: endsAt }, Boolean(facilityId && validRange));

  const clashes = [];
  if (form.start && form.end && !validRange) clashes.push('The end time must be after the start time.');
  if (studio?.status === 'MAINTENANCE') clashes.push(`${studio.name} is under maintenance and cannot be booked.`);
  if (validRange) {
    for (const booking of dayBookingsQuery.data ?? []) {
      if (booking.facilityId === facilityId && BLOCKING_BOOKING_STATUSES.includes(booking.status)
        && rangesOverlap(startsAt, endsAt, booking.startsAt, booking.endsAt)) {
        clashes.push(`Clashes with ${booking.reference}: "${booking.purpose}" (${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}).`);
      }
    }
    for (const block of timetableQuery.data ?? []) {
      if (rangesOverlap(startsAt, endsAt, block.starts_at, block.ends_at)) {
        clashes.push(`A class is scheduled: "${block.title}" (${formatTime(block.starts_at)}–${formatTime(block.ends_at)}).`);
      }
    }
  }

  const participantNames = form.participants.split(',').map((name) => name.trim()).filter(Boolean);
  const ready = facilityId && validRange && form.showName.trim() && form.producer.trim() && participantNames.length > 0;

  const upcoming = (upcomingQuery.data ?? [])
    .filter((booking) => !booking.isEquipmentRequest && studioOptions.some((s) => s.id === booking.facilityId)
      && BLOCKING_BOOKING_STATUSES.includes(booking.status) && booking.endsAt >= pageOpenedAt)
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
      purpose: `Podcast: ${form.showName.trim()}`,
      purposeDetail: `Show: ${form.showName.trim()} · Taking part: ${participantNames.join(', ')} · Producer: ${form.producer.trim()}`,
      operator: form.producer.trim(),
      attendees: participantNames.length,
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
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS · MULTIMEDIA</p>
          <h1>Book a Podcast Slot</h1>
          <p>Reserve the podcast studio without clashing with another recording or a class.</p>
        </div>
      </div>

      <ErrorBanner error={facilitiesQuery.error || upcomingQuery.error || createBooking.error} fallback="Could not book the podcast slot." />

      <div className="detail-grid">
        <section className="live-panel tx-table-panel">
          <h3 className="tx-panel-title">Upcoming studio bookings</h3>
          {upcomingQuery.isPending ? <Loading label="Loading bookings…" variant="table" /> : (
            <div className="live-table-wrap">
              <table className="live-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>TIME</th>
                    <th>SHOW / PURPOSE</th>
                    <th>PRODUCER</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((booking) => (
                    <tr key={booking.id} data-testid={`podcast-booking-${booking.id}`}>
                      <td>{formatDay(booking.startsAt)}</td>
                      <td>{formatTime(booking.startsAt)}–{formatTime(booking.endsAt)}</td>
                      <td><b className="tx-strong">{booking.purpose}</b> <small>{booking.facilityName}</small></td>
                      <td>{booking.operator || '—'}</td>
                      <td>{booking.status === 'PENDING' ? 'Awaiting approval' : 'Approved'}</td>
                    </tr>
                  ))}
                  {upcoming.length === 0 && (
                    <tr><td colSpan={5} className="live-empty">No podcast slots booked yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="live-panel">
          <h3 className="tx-panel-title">Reserve the studio</h3>
          {confirmed && (
            <p className="tx-success">
              <CheckCircle2 size={15} />Requested {confirmed.reference}: {confirmed.purpose} on {formatDay(confirmed.startsAt)} ({formatTime(confirmed.startsAt)}–{formatTime(confirmed.endsAt)}). It is waiting for approval.
            </p>
          )}
          <form className="tx-form" onSubmit={onSubmit}>
            <div className="form-field">
              <label htmlFor="pod-studio">Studio*</label>
              <select id="pod-studio" required value={facilityId} onChange={set('facilityId')} disabled={facilitiesQuery.isPending}>
                {facilitiesQuery.isPending && <option value="">Loading studios…</option>}
                {studioOptions.map((facility) => (
                  <option key={facility.id} value={facility.id}>{facility.name}{facility.status === 'MAINTENANCE' ? ' (maintenance)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="pod-date">Date*</label>
              <input id="pod-date" type="date" required min={todayIso()} value={form.date} onChange={set('date')} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="pod-start">Start time*</label>
                <input id="pod-start" type="time" required value={form.start} onChange={set('start')} />
              </div>
              <div className="form-field">
                <label htmlFor="pod-end">End time*</label>
                <input id="pod-end" type="time" required value={form.end} onChange={set('end')} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="pod-show">Show name*</label>
              <input id="pod-show" required value={form.showName} onChange={set('showName')} placeholder="e.g. Innovation Spotlight Ep.14" />
            </div>
            <div className="form-field">
              <label htmlFor="pod-participants">Who is taking part* (comma separated)</label>
              <input id="pod-participants" required value={form.participants} onChange={set('participants')} placeholder="e.g. Joan Nakazzi, Arthur Kanyike" />
            </div>
            <div className="form-field">
              <label htmlFor="pod-producer">Producer*</label>
              <input id="pod-producer" required value={form.producer} onChange={set('producer')} />
            </div>

            {clashes.length > 0 && (
              <div className="tx-clash" role="alert">
                <ShieldAlert size={16} />
                <div>
                  <b>Schedule conflict:</b>
                  <ul>{clashes.map((clash) => <li key={clash}>{clash}</li>)}</ul>
                </div>
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
