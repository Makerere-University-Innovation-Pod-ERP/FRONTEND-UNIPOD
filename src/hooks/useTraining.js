import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trainingApi } from '@/services/training';

const TRAINING_OVERVIEW_KEY = ['training', 'overview'];

export function useTrainingOverview(token) {
  return useQuery({
    queryKey: TRAINING_OVERVIEW_KEY,
    queryFn: ({ signal }) => trainingApi.getOverview(token, signal),
    staleTime: 1000 * 30,
  });
}

export function useTrainingDepartments(token) {
  return useQuery({
    queryKey: ['training', 'departments'],
    queryFn: ({ signal }) => trainingApi.departments(token, signal),
    staleTime: 1000 * 60 * 5,
  });
}

function useSessionUpdater() {
  const queryClient = useQueryClient();
  return (updatedSession) => {
    queryClient.setQueryData(TRAINING_OVERVIEW_KEY, (old) => (old
      ? { ...old, sessions: old.sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s)) }
      : old));
    queryClient.invalidateQueries({ queryKey: TRAINING_OVERVIEW_KEY });
  };
}

export function useCreateSession(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => trainingApi.createSession(body, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRAINING_OVERVIEW_KEY }),
  });
}

export function useRegisterParticipant(token) {
  const update = useSessionUpdater();
  return useMutation({
    mutationFn: ({ sessionId, participant }) => trainingApi.registerParticipant(sessionId, participant, token),
    onSuccess: update,
  });
}

export function useMarkAttendance(token) {
  const update = useSessionUpdater();
  return useMutation({
    mutationFn: ({ sessionId, participantId, attendance }) =>
      trainingApi.markAttendance(sessionId, participantId, attendance, token),
    onSuccess: update,
  });
}

export function useConfirmPayment(token) {
  const update = useSessionUpdater();
  return useMutation({
    mutationFn: ({ sessionId, participantId }) => trainingApi.confirmPayment(sessionId, participantId, token),
    onSuccess: update,
  });
}

export function useMarkPassed(token) {
  const update = useSessionUpdater();
  return useMutation({
    mutationFn: ({ sessionId, participantId }) => trainingApi.markPassed(sessionId, participantId, token),
    onSuccess: update,
  });
}

export function useMentorshipFollowUps(token) {
  const query = useTrainingOverview(token);
  return { ...query, data: query.data?.followUps };
}

export function useCreateFollowUp(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => trainingApi.createFollowUp(body, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRAINING_OVERVIEW_KEY }),
  });
}

export function useUpdateMentorshipFollowUp(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => trainingApi.updateFollowUp(id, body, token),
    onSuccess: (updated) => {
      queryClient.setQueryData(TRAINING_OVERVIEW_KEY, (old) => (old
        ? { ...old, followUps: old.followUps.map((item) => (item.id === updated.id ? updated : item)) }
        : old));
    },
  });
}
