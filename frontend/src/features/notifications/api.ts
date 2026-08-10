import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { Notification, UnreadCount } from "@/types/notifications"

export const notificationKeys = {
  list: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
}

/**
 * Recent notifications (latest 50). Polling delivery: refetches every 30s and on
 * window focus so the list stays fresh without SSE/WebSocket. Only runs when
 * `enabled` (i.e. the viewer is authenticated).
 */
export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => getList<Notification>("/notifications"),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Unread notification count driving the bell badge. Same polling cadence as
 * {@link useNotifications}; only runs when authenticated.
 */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const { data } = await apiClient.get<UnreadCount>("/notifications/unread-count")
      return data.count
    },
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.put(`/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.put("/notifications/read-all")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}
