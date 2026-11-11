import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/services/media';

const MEDIA_OVERVIEW_KEY = ['media', 'overview'];

export function useMediaOverview(token) {
  return useQuery({
    queryKey: MEDIA_OVERVIEW_KEY,
    queryFn: ({ signal }) => mediaApi.getOverview(token, signal),
  });
}

export function useMediaRequests(token) {
  return useQuery({
    queryKey: ['media', 'requests'],
    queryFn: ({ signal }) => mediaApi.getRequests(token, signal),
  });
}

export function useUpdateMediaStatus(token) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => mediaApi.updateRequestStatus(id, status, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_OVERVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: ['media', 'requests'] });
    },
  });
}

