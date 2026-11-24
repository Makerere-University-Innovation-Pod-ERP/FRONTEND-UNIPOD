import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '@/services/equipment';

const EQUIPMENT_KEY = ['equipment', 'list'];

export function useEquipmentList(token) {
  return useQuery({
    queryKey: EQUIPMENT_KEY,
    queryFn: ({ signal }) => equipmentApi.list(token, signal),
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

export function useMarkEquipmentWorking(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => equipmentApi.markWorking(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
    },
  });
}
