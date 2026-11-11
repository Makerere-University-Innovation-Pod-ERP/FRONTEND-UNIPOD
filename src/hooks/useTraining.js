import { useQuery } from '@tanstack/react-query';
import { trainingApi } from '@/services/training';

const TRAINING_OVERVIEW_KEY = ['training', 'overview'];

export function useTrainingOverview(token) {
  return useQuery({
    queryKey: TRAINING_OVERVIEW_KEY,
    queryFn: ({ signal }) => trainingApi.getOverview(token, signal),
  });
}

export function useTrainingSession(id, token) {
  return useQuery({
    queryKey: ['training', 'session', id],
    queryFn: ({ signal }) => (id ? trainingApi.getSession(id, token, signal) : Promise.reject(new Error('No ID'))),
    enabled: Boolean(id),
  });
}

