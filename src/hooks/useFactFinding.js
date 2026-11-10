import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { factFindingApi } from '@/services/fact-finding';

export const factFindingKeys = {
  queue: (token) => ['fact-finding', 'queue', token],
  case: (token, id) => ['fact-finding', 'case', token, id],
};

export function useFactFindingQueue(token) {
  return useQuery({
    queryKey: factFindingKeys.queue(token),
    queryFn: ({ signal }) => factFindingApi.queue(token, signal),
    enabled: Boolean(token),
  });
}

export function useFactFindingCase(token, id) {
  return useQuery({
    queryKey: factFindingKeys.case(token, id),
    queryFn: ({ signal }) => factFindingApi.caseFile(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useSaveAssessment(token, id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => factFindingApi.saveAssessment(token, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(factFindingKeys.case(token, id), updated);
      void queryClient.invalidateQueries({ queryKey: factFindingKeys.queue(token) });
    },
  });
}
