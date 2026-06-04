import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAppMutation } from './use-mutations'
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadApi,
  markAsRead as markAsReadApi,
} from '@/lib/services/notification.service'

export const useNotifications = () => {
  const [page, setPage] = useState(1)
  const limit = 10

  const query = useQuery({
    queryKey: ['notifications', { page, limit }],
    queryFn: () => getNotifications({ page, limit }),
    placeholderData: keepPreviousData,
  })

  return {
    ...query,
    page,
    setPage,
  }
}

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60000, // Fallback polling every 1 minute
  })
}

export const useMarkAsRead = () => {
  const queryClient = useQueryClient()
  return useAppMutation({
    mutationFn: markAsReadApi,
    onSuccess: () => {
      // Invalidate both the notification list and the unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient()
  return useAppMutation({
    mutationFn: markAllAsReadApi,
    successMessage: 'All notifications marked as read',
    onSuccess: () => {
      // Invalidate both the notification list and the unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
