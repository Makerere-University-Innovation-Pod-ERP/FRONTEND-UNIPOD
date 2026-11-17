import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '@/services/equipment';

const EQUIPMENT_KEY = ['equipment', 'list'];
const LOANS_KEY = ['equipment', 'loans'];

export function useEquipmentList(token) {
  return useQuery({
    queryKey: EQUIPMENT_KEY,
    queryFn: ({ signal }) => equipmentApi.list(token, signal),
    enabled: Boolean(token),
  });
}

export function useEquipmentLoans(token) {
  return useQuery({
    queryKey: LOANS_KEY,
    queryFn: ({ signal }) => equipmentApi.loans(token, signal),
    enabled: Boolean(token),
  });
}

export function useReportEquipmentFault(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => equipmentApi.reportFault(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
    },
  });
}

export function useRequestEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => equipmentApi.requestLoan(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
    },
  });
}

export function useApproveEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, note }) => equipmentApi.approveLoan(loanId, note, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
    },
  });
}

export function useDeclineEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, reason }) => equipmentApi.declineLoan(loanId, reason, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
    },
  });
}

export function useReturnEquipmentLoan(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, condition }) => equipmentApi.returnLoan(loanId, condition, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOANS_KEY });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
    },
  });
}
