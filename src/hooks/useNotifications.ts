import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type AppNotification } from '@/services/notifications';

export const notificationKeys = {
  list: (token: string) => ['notifications', token] as const,
};

export function useNotifications(token: string) {
  return useQuery({
    queryKey: notificationKeys.list(token),
    queryFn: ({ signal }) => notificationsApi.list(token, signal),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useMarkAllNotificationsRead(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(token),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(notificationKeys.list(token), (current) =>
        current?.map((item) => ({ ...item, read: true })),
      );
    },
  });
}
