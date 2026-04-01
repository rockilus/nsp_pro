/**
 * React Query hooks for notification management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationApi } from '../api/notificationApi';
import { NotificationPreferencesT } from '../../../types/notification';
import { useApiClient } from '../api-client';
import { useAuth } from '../../../contexts/auth-context';

export const notificationKeys = {
  all: ['notifications'] as const,
  myList: (limit: number, skip: number) => [...notificationKeys.all, 'list', limit, skip] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  unseenCount: () => [...notificationKeys.all, 'unseen-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

export const SEEN_GRACE_PERIOD_HOURS = 1;

/** Polls unread count every 30 s — used for the bell badge. */
export function useUnreadNotificationCount() {
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => NotificationApi.getUnreadCount(apiClient),
    refetchInterval: 30_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated && !!user?.id_token,
  });
}

/** Polls unseen count every 30 s — used for the bell badge (preferred). */
export function useUnseenNotificationCount() {
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unseenCount(),
    queryFn: () => NotificationApi.getUnseenCount(apiClient),
    refetchInterval: 30_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated && !!user?.id_token,
  });
}

/** Paginated notifications list. */
export function useNotifications(limit = 20, skip = 0) {
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.myList(limit, skip),
    queryFn: () => NotificationApi.getMyNotifications(apiClient, limit, skip),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated && !!user?.id_token,
  });
}

export function useMarkNotificationRead() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationApi.markRead(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => NotificationApi.markAllRead(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsSeen() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => NotificationApi.markAllSeen(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useReadSeenBefore() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (before: string) => NotificationApi.readSeenBefore(apiClient, before),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationApi.deleteNotification(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useNotificationPreferences() {
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => NotificationApi.getNotificationPreferences(apiClient),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated && !!user?.id_token,
  });
}

export function useUpdateNotificationPreferences() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefs: NotificationPreferencesT) =>
      NotificationApi.updateNotificationPreferences(apiClient, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}
