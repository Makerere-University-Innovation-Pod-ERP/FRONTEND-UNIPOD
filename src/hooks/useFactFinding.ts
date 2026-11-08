import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { factFindingApi, type ChecklistItem } from '@/services/fact-finding';

export const factFindingKeys = {
  queue: (token: string) => ['fact-finding', 'queue', token] as const,
  case: (token: string, id: string) => ['fact-finding', 'case', token, id] as const,
};

export function useFactFindingQueue(token: string) {
  return useQuery({
    queryKey: factFindingKeys.queue(token),
    queryFn: ({ signal }) => factFindingApi.queue(token, signal),
    enabled: Boolean(token),
  });
}

export function useFactFindingCase(token: string, id: string) {
  return useQuery({
    queryKey: factFindingKeys.case(token, id),
    queryFn: ({ signal }) => factFindingApi.caseFile(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useSaveAssessment(token: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { checklist: ChecklistItem[]; assessment: string; nextAction: string }) =>
      factFindingApi.saveAssessment(token, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(factFindingKeys.case(token, id), updated);
      void queryClient.invalidateQueries({ queryKey: factFindingKeys.queue(token) });
    },
  });
}
