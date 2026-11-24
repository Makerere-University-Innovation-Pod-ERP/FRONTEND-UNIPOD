import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronDown, Clock, LoaderCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBookings, useCreateBooking, useFacilities, useTimetable } from '@/hooks/useBookings';
import { BLOCKING_BOOKING_STATUSES, rangesOverlap } from '@/services/bookings';
import { isCncFacility } from '@/services/cnc';
import { ErrorBanner, Loading, PageHeading, formatDate } from './shared';

const todayIso = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { facilityId: '', date: todayIso(), start: '09:00', end: '11:00', purpose: '', operator: '', attendees: '1' };
const CNC_SAFETY_PASS_MESSAGE = 'Your account needs a passed CNC safety course (CN5) before you can book this machine. Complete the course, or ask an administrator to verify a pass you already earned.';

function isCncSafetyPassError(error) {
  return error instanceof Error && /Safety training pass \(CN5\) required/i.test(error.message);
}

function dateToInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toInstant(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function MachineBookingPage({ token }) {
  const location = useLocation();
  const navigate = useNavigate();
  const facilitiesQuery = useFacilities(token);
  const createBooking = useCreateBooking(token);
  const [form, setForm] = useState(() => {
    const draft = location.state?.bookingDraft;
    return draft && typeof draft === 'object' ? { ...EMPTY_FORM, ...draft } : EMPTY_FORM;
  });
  const [confirmed, setConfirmed] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [openedAt] = useState(() => new Date().toISOString());

  const machines = (facilitiesQuery.data ?? []).filter(isCncFacility);
  const facilityId = form.facilityId || machines.find((m) => m.status !== 'MAINTENANCE')?.id || '';
  const machine = machines.find((m) => m.id === facilityId);
  const selectedDate = form.date ? new Date(`${form.date}T00:00:00`) : undefined;
  const earliestDate = new Date(`${todayIso()}T00:00:00`);
  const bookingError = isCncSafetyPassError(createBooking.error)
    ? new Error(CNC_SAFETY_PASS_MESSAGE)
    : createBooking.error;

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

  function setValue(field, value) {
    setConfirmed(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function set(field) {
    return (event) => setValue(field, event.target.value);
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
      onError: (error) => {
        if (isCncSafetyPassError(error)) {
          toast.error('CNC safety pass required', {
            description: CNC_SAFETY_PASS_MESSAGE,
          });
          navigate('/cnc/safety', {
            state: { returnToMachineBooking: true, bookingDraft: form },
          });
        }
      },
    });
  }

  return (
    <div className="live-page page-enter cnc-machine-booking">
      <PageHeading title="Book a Machine" intro="Reserve machine time without clashing with other bookings or classes. Machines that need a safety pass can only be booked by people who passed the safety course." />
      <ErrorBanner error={facilitiesQuery.error || allBookings.error || bookingError} fallback="Could not book the machine." />
      {location.state?.returnedFromSafetyCourse && (
        <p className="tx-success" role="status">
          Your booking details have been restored. Retry when your CNC safety pass has been recorded; if you already passed, ask an administrator to update your record.
        </p>
      )}

      <div className="detail-grid cnc-machine-booking__grid">
        <section className="live-panel tx-table-panel cnc-machine-booking__panel cnc-machine-booking__bookings">
          <h3 className="tx-panel-title">Upcoming machine bookings</h3>
          {allBookings.isPending ? <Loading label="Loading bookings…" variant="table" /> : (
            <div className="live-table-wrap">
              <table className="live-table">
          {allBookings.isPending ? <Loading label="Loading bookings…" /> : (
            <div className="live-table-wrap cnc-machine-booking__table-wrap">
              <table className="live-table cnc-machine-booking__table">
                <thead><tr><th>MACHINE</th><th>DATE</th><th>TIME</th><th>OPERATOR</th><th>STATUS</th></tr></thead>
                <tbody>
                  {upcoming.map((booking) => (
                    <tr key={booking.id} data-testid={`machine-booking-${booking.id}`}>
                      <td><b className="tx-strong">{booking.facilityName}</b> <small>{booking.purpose}</small></td>
                      <td>{formatDate(booking.startsAt)}</td>
                      <td>{formatTime(booking.startsAt)}–{formatTime(booking.endsAt)}</td>
                      <td>{booking.operator ?? '—'}</td>
                      <td><span className={`cnc-machine-booking__status ${booking.status === 'PENDING' ? 'is-pending' : 'is-approved'}`}>{booking.status === 'PENDING' ? 'Awaiting approval' : 'Approved'}</span></td>
                    </tr>
                  ))}
                  {upcoming.length === 0 && <tr><td colSpan={5} className="live-empty">No machine time booked yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="live-panel cnc-machine-booking__panel cnc-machine-booking__reserve">
          <h3 className="tx-panel-title">Reserve a machine</h3>
          {confirmed && (
            <p className="tx-success">
              <CheckCircle2 size={15} />Requested {confirmed.reference}: {confirmed.facilityName} on {formatDate(confirmed.startsAt)} ({formatTime(confirmed.startsAt)}–{formatTime(confirmed.endsAt)}). It is waiting for approval.
            </p>
          )}
          <form className="tx-form cnc-machine-booking__form" onSubmit={onSubmit}>
            <div className="form-field">
              <label id="cnc-machine-label" htmlFor="cnc-machine">Machine*</label>
              <Select value={facilityId} onValueChange={(value) => setValue('facilityId', value)} disabled={facilitiesQuery.isPending}>
                <SelectTrigger
                  id="cnc-machine"
                  aria-labelledby="cnc-machine-label"
                  className="cnc-machine-booking__select-trigger"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cnc-machine-booking__select-content" sideOffset={6}>
                  {facilitiesQuery.isPending && <SelectItem value="loading" disabled>Loading machines…</SelectItem>}
                {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="cnc-machine-booking__select-item">
                      {m.name}{m.status === 'MAINTENANCE' ? ' (fault reported)' : ''}{m.requiresSafetyPass ? ' · safety pass required' : ''}
                    </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            {machine?.requiresSafetyPass && (
              <p className="live-note cnc-machine-booking__safety-note">This machine needs a passed safety course. <Link to="/cnc/safety">See safety courses</Link>.</p>
            )}
            <div className="form-field">
              <label id="cnc-date-label" htmlFor="cnc-date">Date*</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="cnc-date"
                    type="button"
                    aria-labelledby="cnc-date-label"
                    aria-haspopup="dialog"
                    aria-expanded={datePickerOpen}
                    className="cnc-machine-booking__date-trigger"
                  >
                    <CalendarDays size={16} aria-hidden="true" />
                    <span>{selectedDate?.toLocaleDateString('en-GB') ?? ''}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  aria-label="Choose booking date"
                  className="cnc-machine-booking__calendar-popover"
                  sideOffset={6}
                >
                  <DateCalendar
                    mode="single"
                    selected={selectedDate}
                    defaultMonth={selectedDate ?? earliestDate}
                    disabled={{ before: earliestDate }}
                    onSelect={(date) => {
                      if (date) setValue('date', dateToInput(date));
                      setDatePickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
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
