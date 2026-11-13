import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { textileApi } from '@/services/textile';

export const textileKeys = {
  all: ['textile'],
  orders: (token) => ['textile', 'orders', token],
  order: (token, id) => ['textile', 'order', token, id],
  priceList: (token) => ['textile', 'price-list', token],
  stock: (token) => ['textile', 'stock', token],
  movements: (token) => ['textile', 'movements', token],
  machines: (token) => ['textile', 'machines', token],
  bookings: (token, from, to) => ['textile', 'bookings', token, from, to],
};

export function useTextileOrders(token) {
  return useQuery({
    queryKey: textileKeys.orders(token),
    queryFn: ({ signal }) => textileApi.orders(token, signal),
    enabled: Boolean(token),
  });
}

export function useTextileOrder(token, id) {
  return useQuery({
    queryKey: textileKeys.order(token, id),
    queryFn: ({ signal }) => textileApi.order(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function usePriceList(token) {
  return useQuery({
    queryKey: textileKeys.priceList(token),
    queryFn: ({ signal }) => textileApi.priceList(token, signal),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
}

export function useStock(token) {
  return useQuery({
    queryKey: textileKeys.stock(token),
    queryFn: ({ signal }) => textileApi.stock(token, signal),
    enabled: Boolean(token),
  });
}

export function useStockMovements(token) {
  return useQuery({
    queryKey: textileKeys.movements(token),
    queryFn: ({ signal }) => textileApi.movements(token, signal),
    enabled: Boolean(token),
  });
}

export function useMachines(token) {
  return useQuery({
    queryKey: textileKeys.machines(token),
    queryFn: ({ signal }) => textileApi.machines(token, signal),
    enabled: Boolean(token),
  });
}

export function useBookings(token, from, to) {
  return useQuery({
    queryKey: textileKeys.bookings(token, from, to),
    queryFn: ({ signal }) => textileApi.bookings(token, from, to, signal),
    enabled: Boolean(token && from && to),
  });
}

/**
 * Order mutations write the returned order into its cache entry and refresh
 * the order list (board, review queue), since every action changes status.
 */
function useOrderMutation(token, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (order) => {
      queryClient.setQueryData(textileKeys.order(token, order.id), order);
      void queryClient.invalidateQueries({ queryKey: textileKeys.orders(token) });
    },
  });
}

export function useCreateOrder(token) {
  return useOrderMutation(token, (payload) => textileApi.createOrder(token, payload));
}

export function useUpdateDraft(token, id) {
  return useOrderMutation(token, (payload) => textileApi.updateDraft(token, id, payload));
}

export function useSendQuote(token, id) {
  return useOrderMutation(token, (body) => textileApi.sendQuote(token, id, body));
}

export function useRequestDetails(token, id) {
  return useOrderMutation(token, (message) => textileApi.requestDetails(token, id, message));
}

export function useSendBack(token, id) {
  return useOrderMutation(token, (reason) => textileApi.sendBack(token, id, reason));
}

export function useOrderTransition(token, id) {
  return useOrderMutation(token, (toStatus) => textileApi.transition(token, id, toStatus));
}

export function useSaveProduction(token, id) {
  return useOrderMutation(token, (body) => textileApi.saveProduction(token, id, body));
}

export function useSaveQuality(token, id) {
  return useOrderMutation(token, (checklist) => textileApi.saveQuality(token, id, checklist));
}

export function useRecordCollection(token, id) {
  return useOrderMutation(token, (collectedBy) => textileApi.recordCollection(token, id, collectedBy));
}

export function useUpdateMinimum(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, minimum }) => textileApi.updateMinimum(token, id, minimum),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: textileKeys.stock(token) }),
  });
}

export function useRecordMovement(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => textileApi.recordMovement(token, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: textileKeys.stock(token) });
      void queryClient.invalidateQueries({ queryKey: textileKeys.movements(token) });
    },
  });
}

export function useReportFault(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ machineId, report, photo }) => textileApi.reportFault(token, machineId, { report, photo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: textileKeys.machines(token) });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkWorking(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) => textileApi.markWorking(token, id, note),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: textileKeys.machines(token) }),
  });
}

function useBookingMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['textile', 'bookings'] }),
  });
}

export function useCreateBooking(token) {
  return useBookingMutation((body) => textileApi.createBooking(token, body));
}

export function useCancelBooking(token) {
  return useBookingMutation(({ bookingId, reason }) => textileApi.cancelBooking(token, bookingId, reason));
}

export function useAddAttendee(token) {
  return useBookingMutation(({ bookingId, name }) => textileApi.addAttendee(token, bookingId, name));
}

export function useSetAttendance(token) {
  return useBookingMutation(({ bookingId, attendeeId, attended }) => textileApi.setAttendance(token, bookingId, attendeeId, attended));
}
