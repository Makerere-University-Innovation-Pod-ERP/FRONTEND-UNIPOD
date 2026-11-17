import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { telecomsApi } from '@/services/telecoms';

export const telecomsKeys = {
  all: ['telecoms'],
  requests: (token) => ['telecoms', 'requests', token],
  request: (token, id) => ['telecoms', 'request', token, id],
  priceList: (token) => ['telecoms', 'price-list', token],
  stock: (token) => ['telecoms', 'stock', token],
  movements: (token) => ['telecoms', 'movements', token],
  equipment: (token) => ['telecoms', 'equipment', token],
  loans: (token) => ['telecoms', 'loans', token],
  labBookings: (token, from, to) => ['telecoms', 'lab-bookings', token, from, to],
  bootcamps: (token) => ['telecoms', 'bootcamps', token],
};

export function useTelecomsRequests(token) {
  return useQuery({
    queryKey: telecomsKeys.requests(token),
    queryFn: ({ signal }) => telecomsApi.requests(token, signal),
    enabled: Boolean(token),
  });
}

export function useTelecomsRequest(token, id) {
  return useQuery({
    queryKey: telecomsKeys.request(token, id),
    queryFn: ({ signal }) => telecomsApi.request(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useTelecomsPriceList(token) {
  return useQuery({
    queryKey: telecomsKeys.priceList(token),
    queryFn: ({ signal }) => telecomsApi.priceList(token, signal),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
}

export function useTelecomsStock(token) {
  return useQuery({
    queryKey: telecomsKeys.stock(token),
    queryFn: ({ signal }) => telecomsApi.stock(token, signal),
    enabled: Boolean(token),
  });
}

export function useTelecomsStockMovements(token) {
  return useQuery({
    queryKey: telecomsKeys.movements(token),
    queryFn: ({ signal }) => telecomsApi.movements(token, signal),
    enabled: Boolean(token),
  });
}

export function useTelecomsEquipment(token) {
  return useQuery({
    queryKey: telecomsKeys.equipment(token),
    queryFn: ({ signal }) => telecomsApi.equipment(token, signal),
    enabled: Boolean(token),
  });
}

export function useTelecomsLoans(token) {
  return useQuery({
    queryKey: telecomsKeys.loans(token),
    queryFn: ({ signal }) => telecomsApi.loans(token, signal),
    enabled: Boolean(token),
  });
}

export function useTelecomsLabBookings(token, from, to) {
  return useQuery({
    queryKey: telecomsKeys.labBookings(token, from, to),
    queryFn: ({ signal }) => telecomsApi.labBookings(token, from, to, signal),
    enabled: Boolean(token && from && to),
  });
}

export function useTelecomsBootcamps(token) {
  return useQuery({
    queryKey: telecomsKeys.bootcamps(token),
    queryFn: ({ signal }) => telecomsApi.bootcamps(token, signal),
    enabled: Boolean(token),
  });
}

function useRequestMutation(token, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (request) => {
      queryClient.setQueryData(telecomsKeys.request(token, request.id), request);
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.requests(token) });
    },
  });
}

export function useCreateTelecomsRequest(token) {
  return useRequestMutation(token, (payload) => telecomsApi.createRequest(token, payload));
}

export function useSendTelecomsQuote(token, id) {
  return useRequestMutation(token, (body) => telecomsApi.sendQuote(token, id, body));
}

export function useRequestTelecomsDetails(token, id) {
  return useRequestMutation(token, (message) => telecomsApi.requestDetails(token, id, message));
}

export function useSendBackTelecomsRequest(token, id) {
  return useRequestMutation(token, (reason) => telecomsApi.sendBack(token, id, reason));
}

export function useUpdateTelecomsStatus(token, id) {
  return useRequestMutation(token, (toStatus) => telecomsApi.updateStatus(token, id, toStatus));
}

export function useUpdateTelecomsWorkDetails(token, id) {
  return useRequestMutation(token, (body) => telecomsApi.updateWorkDetails(token, id, body));
}

export function useMarkTelecomsDone(token, id) {
  return useRequestMutation(token, () => telecomsApi.markDone(token, id));
}

export function useRecordTelecomsMovement(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => telecomsApi.recordMovement(token, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.stock(token) });
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.movements(token) });
    },
  });
}

export function useUpdateTelecomsStockMinimum(token, itemId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minimum) => telecomsApi.updateMinimum(token, itemId, minimum),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.stock(token) });
    },
  });
}

export function useReportTelecomsFault(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => telecomsApi.reportEquipmentFault(token, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.equipment(token) });
    },
  });
}

export function useRequestEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => telecomsApi.requestLoan(token, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.loans(token) });
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.equipment(token) });
    },
  });
}

export function useApproveEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, note }) => telecomsApi.approveLoan(token, loanId, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.loans(token) });
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.equipment(token) });
    },
  });
}

export function useDeclineEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, reason }) => telecomsApi.declineLoan(token, loanId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.loans(token) });
    },
  });
}

export function useReturnEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, condition }) => telecomsApi.returnLoan(token, loanId, condition),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.loans(token) });
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.equipment(token) });
    },
  });
}

export function useCreateLabBooking(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => telecomsApi.createLabBooking(token, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telecoms', 'lab-bookings'] });
    },
  });
}

export function useCreateBootcampSession(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => telecomsApi.createBootcamp(token, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.bootcamps(token) });
    },
  });
}

export function useEnrollBootcamp(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, participant }) => telecomsApi.enrollBootcamp(token, sessionId, participant),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.bootcamps(token) });
    },
  });
}

export function useSaveBootcampAttendance(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, attendance }) => telecomsApi.saveAttendance(token, sessionId, attendance),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telecomsKeys.bootcamps(token) });
    },
  });
}
