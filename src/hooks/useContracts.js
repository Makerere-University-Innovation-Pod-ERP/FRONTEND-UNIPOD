import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/services/contracts';

const CONTRACTS_KEY = ['contracts', 'list'];

export function useContracts(token) {
  return useQuery({
    queryKey: CONTRACTS_KEY,
    queryFn: ({ signal }) => contractsApi.list(token, signal),
    enabled: Boolean(token),
  });
}

export function useCreateContract(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => contractsApi.create(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY });
    },
  });
}

export function useUpdateContract(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => contractsApi.update(id, body, token),
    onSuccess: (updated) => {
      queryClient.setQueryData(CONTRACTS_KEY, (old) =>
        (old ?? []).map((item) => (item.id === updated.id ? updated : item)));
    },
  });
}
