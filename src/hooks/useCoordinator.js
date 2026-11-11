import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coordinatorApi } from '@/services/coordinator';

export const coordinatorKeys = {
  briefs: (token) => ['coordinator', 'briefs', token],
  brief: (token, id) => ['coordinator', 'brief', token, id],
  reviewerPool: (token) => ['coordinator', 'reviewer-pool', token],
};

export function useCoordinatorBriefs(token) {
  return useQuery({
    queryKey: coordinatorKeys.briefs(token),
    queryFn: ({ signal }) => coordinatorApi.briefs(token, signal),
    enabled: Boolean(token),
  });
}

export function useCoordinatorBrief(token, id) {
  return useQuery({
    queryKey: coordinatorKeys.brief(token, id),
    queryFn: ({ signal }) => coordinatorApi.brief(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useReviewerPool(token) {
  return useQuery({
    queryKey: coordinatorKeys.reviewerPool(token),
    queryFn: ({ signal }) => coordinatorApi.reviewerPool(token, signal),
    enabled: Boolean(token),
  });
}

export function useAssignReviewers(token, id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => coordinatorApi.assignReviewers(token, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(coordinatorKeys.brief(token, id), updated);
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.briefs(token) });
    },
  });
}
