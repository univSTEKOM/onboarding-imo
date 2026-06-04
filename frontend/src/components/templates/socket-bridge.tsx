import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { addToast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Notification as NotificationEntity } from '@/types/api'
import { getToken } from '@/lib/utils/cookies'
import { useAuthStore } from '@/lib/stores/auth.store'
import { useSocketStore } from '@/lib/stores/socket.store'

/**
 * Runs the notifications socket lifecycle and writes connection state into
 * {@link useSocketStore}. Renders nothing — mount once under the router (it
 * needs `useNavigate`). Connects only while authenticated.
 */
export function SocketBridge() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Ask for browser notification permission once.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    }
  }, [])

  useEffect(() => {
    const { setSocket, setConnected } = useSocketStore.getState()

    if (!isAuthenticated) {
      const existing = useSocketStore.getState().socket
      if (existing) {
        existing.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const token = getToken()
    const newSocket = io(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/notifications`,
      { auth: { token } },
    )

    newSocket.on('connect', () => setConnected(true))
    newSocket.on('disconnect', () => setConnected(false))

    newSocket.on('new_notification', (notification: NotificationEntity) => {
      const colorMap: Record<
        string,
        'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
      > = {
        info: 'primary',
        success: 'success',
        warning: 'warning',
        error: 'danger',
      }

      addToast({
        title: notification.title,
        description: notification.message,
        color: colorMap[notification.type] || 'primary',
      })

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const n = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        })
        n.onclick = () => {
          window.focus()
          if (notification.link) void navigate({ to: notification.link })
          n.close()
        }
      }

      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [isAuthenticated, queryClient, navigate])

  return null
}
