import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewerApi } from '@/services/reviewer';

export const reviewerKeys = {
  assigned: (token) => ['reviewer', 'assigned', token],
  case: (token, id) => ['reviewer', 'case', token, id],
};

export function useReviewerAssigned(token) {
  return useQuery({
    queryKey: reviewerKeys.assigned(token),
    queryFn: ({ signal }) => reviewerApi.assigned(token, signal),
    enabled: Boolean(token),
  });
}

export function useReviewerCase(token, id) {
  return useQuery({
    queryKey: reviewerKeys.case(token, id),
    queryFn: ({ signal }) => reviewerApi.caseSummary(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useSubmitDecision(token, id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => reviewerApi.submitDecision(token, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(reviewerKeys.case(token, id), updated);
      void queryClient.invalidateQueries({ queryKey: reviewerKeys.assigned(token) });
    },
  });
}
