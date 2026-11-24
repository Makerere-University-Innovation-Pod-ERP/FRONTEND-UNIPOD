import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications';

export const notificationKeys = {
  list: (token) => ['notifications', token],
  unreadCount: (token) => ['notifications', 'unread-count', token],
};

export function useNotifications(token, { page = 0, size = 25, unread = false } = {}) {
  return useQuery({
    queryKey: [...notificationKeys.list(token), page, size, unread],
    queryFn: ({ signal }) => notificationsApi.list(token, { page, size, unread }, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationCount(token) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(token),
    queryFn: ({ signal }) => notificationsApi.unreadCount(token, signal).then(({ unread }) => unread),
    enabled: Boolean(token),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkAllNotificationsRead(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(token),
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: notificationKeys.list(token) }, (current) =>
        current ? { ...current, items: current.items.map((item) => ({ ...item, read: true })) } : current,
      );
      queryClient.setQueryData(notificationKeys.unreadCount(token), 0);
      return queryClient.invalidateQueries({ queryKey: notificationKeys.list(token) });
    },
  });
}

export function useMarkNotificationRead(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.markRead(id, token),
    onSuccess: (notification) => {
      queryClient.setQueriesData({ queryKey: notificationKeys.list(token) }, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) => (
                item.id === notification.id ? { ...item, ...notification } : item
              )),
            }
          : current,
      );
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(token) });
      return queryClient.invalidateQueries({ queryKey: notificationKeys.list(token) });
    },
  });
}
