import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/services/bookings';
import { notificationKeys } from '@/hooks/useNotifications';

const BOOKINGS_KEY = ['bookings'];
const SUBMITTER_BOOKINGS_KEY = ['submitter', 'bookings'];

export function useFacilities(token) {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: ({ signal }) => bookingsApi.facilities(token, signal),
    enabled: Boolean(token),
    staleTime: 1000 * 60,
  });
}

export function useBookings(token, filters = {}) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, filters],
    queryFn: ({ signal }) => bookingsApi.list(filters, token, signal),
    enabled: Boolean(token),
    select: (page) => page.items,
  });
}

export function useSubmitterBookings(token, { page = 0, size = 25 } = {}) {
  return useQuery({
    queryKey: [...SUBMITTER_BOOKINGS_KEY, page, size],
    queryFn: ({ signal }) => bookingsApi.listMyBookings({ page, size }, token, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitterBooking(token, id, enabled = true) {
  return useQuery({
    queryKey: [...SUBMITTER_BOOKINGS_KEY, 'detail', id],
    queryFn: ({ signal }) => bookingsApi.myBooking(id, token, signal),
    enabled: Boolean(token && id && enabled),
    retry: false,
    staleTime: 30_000,
  });
}

function useSubmitterBookingMutation(mutationFn, token, refreshNotifications = false) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBMITTER_BOOKINGS_KEY });
      if (refreshNotifications) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(token) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(token) });
      }
    },
  });
}

export function useCreateSubmitterBooking(token) {
  return useSubmitterBookingMutation(
    (body) => bookingsApi.createMyBooking(body, token),
    token,
    true,
  );
}

export function useCancelSubmitterBooking(token) {
  return useSubmitterBookingMutation(
    (id) => bookingsApi.cancelMyBooking(id, token),
    token,
    true,
  );
}

export function useTimetable(token, filters, enabled = true) {
  return useQuery({
    queryKey: ['timetable', filters],
    queryFn: ({ signal }) => bookingsApi.timetable(filters, token, signal),
    enabled: Boolean(token) && enabled,
  });
}

function useBookingMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useCreateBooking(token) {
  return useBookingMutation((body) => bookingsApi.create(body, token));
}

export function useDecideAllocation(token) {
  return useBookingMutation(({ id, decision, note }) => bookingsApi.decideAllocation(id, decision, note, token));
}

export function useReturnAllocation(token) {
  return useBookingMutation(({ id, ...body }) => bookingsApi.returnAllocation(id, body, token));
}
