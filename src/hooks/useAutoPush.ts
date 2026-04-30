import { useEffect, useRef } from 'react'
import { isPushSupported, subscribeToPush, isCurrentlySubscribed } from '@/features/notifications/push-api'

/**
 * Automatically subscribes the user to push notifications.
 * Runs silently — if permission is already granted it subscribes immediately,
 * otherwise it requests permission once per session.
 */
export function useAutoPush(userId: string | undefined) {
  const attempted = useRef(false)

  useEffect(() => {
    if (!userId || attempted.current) return
    if (!isPushSupported()) return

    attempted.current = true

    ;(async () => {
      const alreadySubscribed = await isCurrentlySubscribed()
      if (alreadySubscribed) return

      // If permission already granted, subscribe silently
      if (Notification.permission === 'granted') {
        await subscribeToPush(userId)
        return
      }

      // If not denied, request permission and subscribe
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          await subscribeToPush(userId)
        }
      }
    })()
  }, [userId])
}
