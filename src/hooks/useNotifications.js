import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications';

export const notificationKeys = {
  list: (token) => ['notifications', token],
};

export function useNotifications(token) {
  return useQuery({
    queryKey: notificationKeys.list(token),
    queryFn: ({ signal }) => notificationsApi.list(token, signal),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useMarkAllNotificationsRead(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(token),
    onSuccess: () => {
      queryClient.setQueryData(notificationKeys.list(token), (current) =>
        current?.map((item) => ({ ...item, read: true })),
      );
    },
  });
}
