import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trainingApi } from '@/services/training';
import { initialMentorshipFollowUps, initialTrainingSessions } from '@/mocks/fixtures/training';

const TRAINING_OVERVIEW_KEY = ['training', 'overview'];

const fallbackOverview = {
  upcomingSessions: initialTrainingSessions.filter((s) => s.status === 'Upcoming' || s.status === 'UPCOMING').length,
  seatsFilled: initialTrainingSessions.reduce((acc, s) => acc + s.enrolledCount, 0),
  totalSeats: initialTrainingSessions.reduce((acc, s) => acc + s.capacity, 0),
  mentorshipFollowUps: initialMentorshipFollowUps.length,
  sessions: initialTrainingSessions,
  followUps: initialMentorshipFollowUps,
};

export function useTrainingOverview(token) {
  return useQuery({
    queryKey: TRAINING_OVERVIEW_KEY,
    queryFn: ({ signal }) => trainingApi.getOverview(token, signal),
    initialData: fallbackOverview,
    staleTime: 1000 * 30,
  });
}

export function useTrainingSession(id, token) {
  return useQuery({
    queryKey: ['training', 'session', id],
    queryFn: ({ signal }) => (id ? trainingApi.getSession(id, token, signal) : Promise.reject(new Error('No ID'))),
    enabled: Boolean(id),
  });
}

export function useMarkAttendance(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, participantId, attendance }) =>
      trainingApi.markAttendance(sessionId, participantId, attendance, token),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(TRAINING_OVERVIEW_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          sessions: old.sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
        };
      });
      queryClient.setQueryData(['training', 'session', updatedSession.id], updatedSession);
    },
  });
}

export function useRegisterParticipant(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, participant }) =>
      trainingApi.registerParticipant(sessionId, participant, token),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: TRAINING_OVERVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: ['training', 'session', sessionId] });
    },
  });
}
