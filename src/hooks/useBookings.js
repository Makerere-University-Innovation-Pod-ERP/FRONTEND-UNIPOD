import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/services/bookings';

const BOOKINGS_KEY = ['bookings'];

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
