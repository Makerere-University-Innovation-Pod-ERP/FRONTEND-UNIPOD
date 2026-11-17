/**
 * Podcast slot booking (Assignment 8). Mirrors the Telecoms lab-booking
 * clash-detection approach (src/lib/telecoms.js's findLabBookingClashes)
 * for the Multimedia podcast booth/studio calendar.
 */

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

export function findPodcastSlotClashes(proposal, { slots = [] } = {}) {
  const clashes = [];
  if (!proposal.date || !proposal.start || !proposal.end) return clashes;
  if (timeToMinutes(proposal.end) <= timeToMinutes(proposal.start)) {
    return [{ kind: 'time', message: 'The end time must be after the start time.' }];
  }
  for (const slot of slots) {
    if (slot.id === proposal.id || slot.status === 'CANCELLED') continue;
    if (slot.date === proposal.date && overlaps(proposal.start, proposal.end, slot.start, slot.end)) {
      clashes.push({ kind: 'slot', message: `Clashes with an existing booking: "${slot.purpose}" (${slot.start}–${slot.end}).` });
    }
  }
  return clashes;
}
