import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, UserPlus, UserMinus, Hand, Check, CheckCheck, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from './api'

interface NotificationBellProps {
  userId: string
}

const NOTIF_QK = ['notifications']

const typeConfig: Record<string, { icon: typeof UserPlus; color: string; bgColor: string }> = {
  attendee_joined: { icon: UserPlus, color: 'text-accent', bgColor: 'bg-accent/10' },
  attendee_left: { icon: UserMinus, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  sitter_created: { icon: Hand, color: 'text-primary', bgColor: 'bg-primary/10' },
}

function NotificationItem({
  notif,
  onMarkRead,
}: {
  notif: Notification
  onMarkRead: (id: string) => void
}) {
  const isRead = Number(notif.read) > 0
  const config = typeConfig[notif.type] ?? typeConfig.attendee_joined
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        !isRead ? 'bg-primary/[0.03]' : 'bg-transparent',
      )}
    >
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', config.bgColor)}>
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13px] leading-snug', !isRead ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {notif.message}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!isRead && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id) }}
          className="mt-1 shrink-0 rounded p-1 text-muted-foreground/50 transition hover:bg-muted hover:text-foreground"
          title="Mark as read"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const desktopPanelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  const { data: notifications = [] } = useQuery({
    queryKey: NOTIF_QK,
    queryFn: () => listNotifications(userId),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: !!userId,
  })

  const unreadCount = useMemo(
    () => notifications.filter((n) => Number(n.read) === 0).length,
    [notifications],
  )

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIF_QK }),
  })

  const markAllMut = useMutation({
    mutationFn: () => markAllNotificationsRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIF_QK }),
  })

  // Compute desktop dropdown position anchored to button
  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
  }, [open])

  // Close on outside click (covers both portalled panels)
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const inButton = buttonRef.current?.contains(target)
      const inMobile = mobilePanelRef.current?.contains(target)
      const inDesktop = desktopPanelRef.current?.contains(target)
      if (!inButton && !inMobile && !inDesktop) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function NotifList({ maxH }: { maxH?: boolean }) {
    return notifications.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-10">
        <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    ) : (
      <div className={cn('divide-y divide-border/50', maxH && 'max-h-[22rem] overflow-y-auto')}>
        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notif={notif}
            onMarkRead={(id) => markReadMut.mutate(id)}
          />
        ))}
      </div>
    )
  }

  function MarkAllBtn() {
    if (unreadCount === 0) return null
    return (
      <button
        type="button"
        onClick={() => markAllMut.mutate()}
        disabled={markAllMut.isPending}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition hover:text-primary/80 disabled:opacity-50"
      >
        <CheckCheck className="h-3.5 w-3.5" />
        Mark all read
      </button>
    )
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full transition',
          open
            ? 'bg-primary/12 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile: full-screen panel portalled to body — escapes z-50 toolbar stacking context */}
      {open && createPortal(
        <div
          ref={mobilePanelRef}
          className="fixed inset-x-0 top-0 bottom-0 z-[9999] flex flex-col bg-background sm:hidden overflow-hidden animate-in fade-in-0 slide-in-from-top-2"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              <MarkAllBtn />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NotifList />
          </div>
        </div>,
        document.body,
      )}

      {/* Desktop: positioned dropdown portalled to body */}
      {open && createPortal(
        <div
          ref={desktopPanelRef}
          className="fixed z-[9999] hidden w-96 flex-col rounded-xl border border-border bg-background shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 sm:flex"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <MarkAllBtn />
          </div>
          <NotifList maxH />
        </div>,
        document.body,
      )}
    </>
  )
}
