import { useEffect, useState, useCallback } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isCurrentlySubscribed,
} from './push-api'

interface PushToggleProps {
  userId: string
}

export function PushToggle({ userId }: PushToggleProps) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const sup = isPushSupported()
      setSupported(sup)
      if (sup) {
        const sub = await isCurrentlySubscribed()
        setSubscribed(sub)
      }
      setLoading(false)
    }
    check()
  }, [])

  const toggle = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush(userId)
        if (ok) setSubscribed(false)
      } else {
        const ok = await subscribeToPush(userId)
        if (ok) setSubscribed(true)
      }
    } finally {
      setLoading(false)
    }
  }, [subscribed, loading, userId])

  if (!supported) return null

  const Icon = loading ? Loader2 : subscribed ? Bell : BellOff

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition',
        subscribed
          ? 'bg-accent/12 text-accent hover:bg-accent/18'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
        loading && 'opacity-60 cursor-wait',
      )}
      title={subscribed ? 'Disable push notifications' : 'Enable push notifications'}
    >
      <Icon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
      <span className="hidden sm:inline">
        {loading ? 'Loading...' : subscribed ? 'Push on' : 'Push off'}
      </span>
    </button>
  )
}
