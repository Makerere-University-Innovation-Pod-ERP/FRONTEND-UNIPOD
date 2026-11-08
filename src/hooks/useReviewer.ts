import { useQuery } from '@tanstack/react-query';
import { reviewerApi } from '@/services/reviewer';

export const reviewerKeys = {
  assigned: (token: string) => ['reviewer', 'assigned', token] as const,
  case: (token: string, id: string) => ['reviewer', 'case', token, id] as const,
};

export function useReviewerAssigned(token: string) {
  return useQuery({
    queryKey: reviewerKeys.assigned(token),
    queryFn: ({ signal }) => reviewerApi.assigned(token, signal),
    enabled: Boolean(token),
  });
}

export function useReviewerCase(token: string, id: string) {
  return useQuery({
    queryKey: reviewerKeys.case(token, id),
    queryFn: ({ signal }) => reviewerApi.caseSummary(token, id, signal),
    enabled: Boolean(token && id),
  });
}
