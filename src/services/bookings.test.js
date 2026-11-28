import { beforeEach, describe, expect, it } from 'vitest';
import { resetSubmitterBookingMocks } from '@/mocks/handlers';
import { makeMockToken } from '@/mocks/jwt';
import { bookingsApi } from './bookings';

const submitterToken = makeMockToken(
  ['ROLE_SUBMITTER'],
  'brian.s',
  'submitter@unipod.test',
);

beforeEach(() => {
  resetSubmitterBookingMocks();
});

describe('submitter booking API', () => {
  it('lists and reads only bookings belonging to the signed-in submitter', async () => {
    const page = await bookingsApi.listMyBookings({}, submitterToken);
    expect(page.items.map((booking) => booking.reference)).toEqual([
      'BKG-2026-001201',
      'BKG-2026-001188',
    ]);

    const booking = await bookingsApi.myBooking(page.items[0].id, submitterToken);
    expect(booking.operator).toBe('Brian S.');

    const anotherSubmitter = makeMockToken(
      ['ROLE_SUBMITTER'],
      'another.user',
      'another@unipod.test',
    );
    expect((await bookingsApi.listMyBookings({}, anotherSubmitter)).totalElements).toBe(0);
    await expect(bookingsApi.myBooking(page.items[0].id, anotherSubmitter))
      .rejects.toMatchObject({ status: 404 });
  });

  it('creates and cancels bookings using the submitter-scoped endpoints', async () => {
    const created = await bookingsApi.createMyBooking({
      facilityId: 'fac-studio-a',
      purpose: 'Test booking',
      startsAt: '2026-12-20T09:00:00.000Z',
      endsAt: '2026-12-20T11:00:00.000Z',
      attendees: 2,
      operator: 'Test operator',
    }, submitterToken);

    expect(created.reference).toBe('BKG-2026-001202');
    expect(created.status).toBe('PENDING');

    const cancelled = await bookingsApi.cancelMyBooking(created.id, submitterToken);
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('shows submitter bookings in the admin listing and reflects decisions to submitters', async () => {
    const adminToken = makeMockToken(['ROLE_ADMINISTRATOR'], 'Demo Administrator', 'admin@unipod.test');
    const page = await bookingsApi.list({}, adminToken);
    expect(page.items.map((booking) => booking.reference)).toContain('BKG-2026-001201');

    const decided = await bookingsApi.decideAllocation(
      '00000000-0000-4000-8000-000000000301',
      'DECLINED',
      'Not available',
      adminToken,
    );
    expect(decided.status).toBe('REJECTED');

    const submitterVisible = await bookingsApi.myBooking(decided.id, submitterToken);
    expect(submitterVisible.status).toBe('REJECTED');
    expect(submitterVisible.rejectionReason).toBe('Not available');
  });

  it('rejects submitter bookings that overlap timetable blocks', async () => {
    await expect(bookingsApi.createMyBooking({
      facilityId: 'fac-podcast',
      purpose: 'Blocked lecture time',
      startsAt: '2027-01-21T08:00:00.000Z',
      endsAt: '2027-01-21T10:00:00.000Z',
      attendees: 2,
      operator: 'Test operator',
    }, submitterToken)).rejects.toMatchObject({ status: 409 });
  });
});
