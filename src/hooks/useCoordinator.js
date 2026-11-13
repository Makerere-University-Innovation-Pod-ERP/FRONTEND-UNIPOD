import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coordinatorApi } from '@/services/coordinator';

export const coordinatorKeys = {
  briefs: (token) => ['coordinator', 'briefs', token],
  brief: (token, id) => ['coordinator', 'brief', token, id],
  reviewerPool: (token) => ['coordinator', 'reviewer-pool', token],
  decision: (token, id) => ['coordinator', 'decision', token, id],
  improvements: (token) => ['coordinator', 'improvements', token],
  changes: (token, id) => ['coordinator', 'changes', token, id],
  versions: (token, id) => ['coordinator', 'versions', token, id],
};

export function useVersionsView(token, id) {
  return useQuery({
    queryKey: coordinatorKeys.versions(token, id),
    queryFn: ({ signal }) => coordinatorApi.versionsView(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useRecordVersion(token, id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => coordinatorApi.recordVersion(token, id, body),
    onSuccess: (view) => {
      queryClient.setQueryData(coordinatorKeys.versions(token, id), view);
      // The brief returns to review with an empty panel, leaves the
      // improvement queue, and its request is now answered.
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.brief(token, id) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.changes(token, id) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.decision(token, id) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.improvements(token) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.briefs(token) });
    },
  });
}

export function useChangesView(token, id) {
  return useQuery({
    queryKey: coordinatorKeys.changes(token, id),
    queryFn: ({ signal }) => coordinatorApi.changesView(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useSaveChangeRequest(token, id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => coordinatorApi.saveChangeRequest(token, id, body),
    onSuccess: (view) => {
      queryClient.setQueryData(coordinatorKeys.changes(token, id), view);
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.improvements(token) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.brief(token, id) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.briefs(token) });
    },
  });
}

export function useImprovementQueue(token) {
  return useQuery({
    queryKey: coordinatorKeys.improvements(token),
    queryFn: ({ signal }) => coordinatorApi.improvements(token, signal),
    enabled: Boolean(token),
  });
}

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

export function useDecisionView(token, id) {
  return useQuery({
    queryKey: coordinatorKeys.decision(token, id),
    queryFn: ({ signal }) => coordinatorApi.decisionView(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useRecordDecision(token, id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => coordinatorApi.recordDecision(token, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(coordinatorKeys.brief(token, id), updated);
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.decision(token, id) });
      void queryClient.invalidateQueries({ queryKey: coordinatorKeys.briefs(token) });
    },
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
