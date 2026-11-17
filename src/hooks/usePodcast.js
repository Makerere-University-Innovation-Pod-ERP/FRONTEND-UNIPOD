import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { podcastApi } from '@/services/podcast';

const PODCAST_SLOTS_KEY = ['podcast', 'slots'];

export function usePodcastSlots(token) {
  return useQuery({
    queryKey: PODCAST_SLOTS_KEY,
    queryFn: ({ signal }) => podcastApi.slots(token, signal),
    enabled: Boolean(token),
  });
}

export function useCreatePodcastSlot(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => podcastApi.createSlot(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PODCAST_SLOTS_KEY });
    },
  });
}
