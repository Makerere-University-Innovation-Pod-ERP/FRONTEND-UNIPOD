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
    mutationFn: (contract) => contractsApi.create(contract, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY }),
  });
}

export function useTransitionContract(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, signedContractDocId }) => contractsApi.transition(id, status, signedContractDocId, token),
    onSuccess: (updated) => {
      queryClient.setQueryData(CONTRACTS_KEY, (old) =>
        (old ?? []).map((item) => (item.id === updated.id ? updated : item)));
    },
  });
}
