import { useState } from 'react';
import { CheckCircle2, Clock, LoaderCircle, ShieldAlert } from 'lucide-react';
import { findPodcastSlotClashes, todayIso } from '@/lib/podcast';
import { useCreatePodcastSlot, usePodcastSlots } from '@/hooks/usePodcast';
import { ErrorBanner, Loading } from './shared';

const EMPTY_FORM = {
  date: todayIso(),
  start: '10:00',
  end: '11:00',
  purpose: '',
  producer: '',
  bookedBy: '',
  studio: 'Podcast Booth',
};

export function PodcastBookingPage({ token }) {
  const slotsQuery = usePodcastSlots(token);
  const createSlot = useCreatePodcastSlot(token);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(null);

  const slots = slotsQuery.data ?? [];
  const upcoming = [...slots].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const clashes = findPodcastSlotClashes(form, { slots });
  const ready = form.date && form.start && form.end && form.purpose.trim() && form.producer.trim() && form.bookedBy.trim();

  function set(field) {
    return (event) => {
      setConfirmed(null);
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function onSubmit(event) {
    event.preventDefault();
    if (!ready || clashes.length > 0) return;
    createSlot.mutateAsync(form)
      .then((saved) => {
        setConfirmed(saved);
        setForm(EMPTY_FORM);
      })
      .catch(() => {});
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS · MULTIMEDIA</p>
          <h1>Book a Podcast Slot</h1>
          <p>Reserve the podcast booth without clashing with another recording.</p>
        </div>
      </div>

      <ErrorBanner error={slotsQuery.error || createSlot.error} fallback="Could not book the podcast slot." />

      <div className="detail-grid">
        <section className="live-panel tx-table-panel">
          <h3 className="tx-panel-title">Upcoming bookings</h3>
          {slotsQuery.isLoading ? <Loading label="Loading bookings…" /> : (
            <div className="live-table-wrap">
              <table className="live-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>TIME</th>
                    <th>PURPOSE</th>
                    <th>PRODUCER</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((slot) => (
                    <tr key={slot.id}>
                      <td>{slot.date}</td>
                      <td>{slot.start}–{slot.end}</td>
                      <td><b className="tx-strong">{slot.purpose}</b></td>
                      <td>{slot.producer}</td>
                    </tr>
                  ))}
                  {upcoming.length === 0 && (
                    <tr><td colSpan={4} className="live-empty">No podcast slots booked yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="live-panel">
          <h3 className="tx-panel-title">Reserve the booth</h3>
          {confirmed && (
            <p className="tx-success">
              <CheckCircle2 size={15} />Booked: {confirmed.purpose} on {confirmed.date} ({confirmed.start}–{confirmed.end}).
            </p>
          )}
          <form className="tx-form" onSubmit={onSubmit}>
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
              <label htmlFor="pod-purpose">Purpose*</label>
              <input id="pod-purpose" required value={form.purpose} onChange={set('purpose')} placeholder="e.g. Innovation Spotlight Ep.14" />
            </div>
            <div className="form-field">
              <label htmlFor="pod-producer">Producer*</label>
              <input id="pod-producer" required value={form.producer} onChange={set('producer')} />
            </div>
            <div className="form-field">
              <label htmlFor="pod-booked-by">Booked by*</label>
              <input id="pod-booked-by" required value={form.bookedBy} onChange={set('bookedBy')} />
            </div>

            {clashes.length > 0 && (
              <div className="tx-clash" role="alert">
                <ShieldAlert size={16} />
                <div>
                  <b>Schedule conflict:</b>
                  <ul>{clashes.map((clash, index) => <li key={index}>{clash.message}</li>)}</ul>
                </div>
              </div>
            )}

            <div className="tx-actions">
              <button type="submit" className="btn btn-primary" disabled={!ready || clashes.length > 0 || createSlot.isPending}>
                {createSlot.isPending ? <LoaderCircle className="spin" size={15} /> : <Clock size={15} />}Confirm booking
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
