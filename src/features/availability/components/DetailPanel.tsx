import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  X,
  Pencil,
  Clock3,
  CalendarDays,
  Globe,
  FileText,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  AlertCircle,
  Link,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { AvailabilityEntry } from '@/features/availability/api'
import {
  listAttendees,
  addAttendee,
  removeAttendee,
  type SessionAttendee,
} from '@/features/availability/attendees-api'
import {
  formatTime12h,
  entryDisplayDate,
  entryDisplayTimes,
} from '@/features/availability/utils/calendarHelpers'
import { AddToCalendarButton } from './AddToCalendarButton'
import { beautifyName } from '@/features/availability/utils/nameHelpers'

interface DetailPanelProps {
  open: boolean
  entry: AvailabilityEntry | null
  allEntries: AvailabilityEntry[]
  displayTimezone: string
  onClose: () => void
  onEdit: (entry: AvailabilityEntry) => void
  onAttendeesChange?: () => void
  user?: { id: string; email: string; displayName?: string | null } | null
  isAdmin?: boolean
  canEdit?: (entry: AvailabilityEntry) => boolean
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

function tzAbbreviation(tz: string): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).format(new Date())
    return formatted.split(' ').pop() ?? tz
  } catch {
    return tz
  }
}

export function DetailPanel({
  open,
  entry,
  allEntries,
  displayTimezone,
  onClose,
  onEdit,
  onAttendeesChange,
  user,
  isAdmin,
  canEdit,
}: DetailPanelProps) {
  const [attendees, setAttendees] = useState<SessionAttendee[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joinEmail, setJoinEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removedId, setRemovedId] = useState<string | null>(null)

  useEffect(() => {
    if (!entry) {
      setAttendees([])
      return
    }
    // Only load attendees for sitter entries
    if (entry.role === 'sitter') {
      setLoadingAttendees(true)
      listAttendees(entry.id)
        .then(setAttendees)
        .catch(() => setAttendees([]))
        .finally(() => setLoadingAttendees(false))
    } else {
      setAttendees([])
    }
    setJoinName(user?.displayName || user?.email?.split('@')[0] || '')
    setJoinEmail(user?.email || '')
  }, [entry, user])

  async function handleAddAttendee() {
    if (!entry || !joinName.trim() || !joinEmail.trim()) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(joinEmail.trim())) {
      toast.error('Please enter a valid email address')
      return
    }
    setIsAdding(true)
    try {
      const newAttendee = await addAttendee(entry.id, joinName.trim(), joinEmail.trim())
      setAttendees((prev) => [...prev, newAttendee])
      setJoinName('')
      setJoinEmail('')
      toast.success('Successfully joined the session!')
      onAttendeesChange?.()
    } catch {
      toast.error('Failed to join session. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveAttendee(id: string) {
    setRemovingId(id)
    try {
      await removeAttendee(id)
      setRemovedId(id)
      onAttendeesChange?.()
      // Brief success flash, then remove from list
      setTimeout(() => {
        setAttendees((prev) => prev.filter((a) => a.id !== id))
        setRemovedId(null)
      }, 900)
    } catch {
      toast.error('Failed to remove attendee')
    } finally {
      setRemovingId(null)
    }
  }

  if (!open || !entry) return null

  const isBreather = entry.role === 'breather'
  const isSitter = entry.role === 'sitter'
  const dateKey = entryDisplayDate(entry, displayTimezone)
  const { startTime, endTime } = entryDisplayTimes(entry, displayTimezone)
  const formattedDate = format(new Date(`${dateKey}T00:00:00`), 'EEEE, MMMM d, yyyy')
  const timeRange = `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`
  const tzLabel = tzAbbreviation(displayTimezone)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 animate-fade-overlay-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl animate-slide-in-right',
          'sm:max-w-[26rem]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Session Details
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?entry=${entry.id}`
                navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => toast.error('Could not copy link'))
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Copy link to this session"
            >
              <Link className="h-3.5 w-3.5" />
              Copy link
            </button>
            {(!canEdit || canEdit(entry)) && (
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-5 p-5">
            {/* Role pill + Name */}
            <div className="space-y-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  isBreather
                    ? 'bg-primary/10 text-primary'
                    : 'bg-accent/10 text-accent'
                )}
              >
                {isBreather ? 'Breather' : 'Sitter'}
              </span>
              <h3 className="font-heading text-lg font-semibold text-foreground leading-tight">
                {beautifyName(entry.name)}
              </h3>
            </div>

            {/* Detail rows */}
            <div className="space-y-2.5">
              {/* Date */}
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground">{formattedDate}</span>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground">{timeRange}</span>
              </div>

              {/* Timezone */}
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground">{tzLabel}</span>
              </div>

              {/* Notes */}
              {entry.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-foreground whitespace-pre-wrap">{entry.notes}</p>
                </div>
              )}
            </div>

            {/* ─── Add to Calendar ─── */}
            <div>
              <AddToCalendarButton entry={entry} />
            </div>

            {/* Breather: sitter info (no longer tracked via direct assignment) */}
            {isBreather && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Sitter Session</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sitter sessions are matched through the timeline view.
                </p>
              </div>
            )}

            {/* ─── Sitter: Attendees ─── */}
            {isSitter && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">Attendees</h4>
                  </div>
                  {entry.maxAttendees != null && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 font-medium',
                        attendees.length >= entry.maxAttendees
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-accent/10 text-accent'
                      )}>
                        {attendees.length}/{entry.maxAttendees} taken
                      </span>
                      {attendees.length < entry.maxAttendees && (
                        <span className="text-muted-foreground">
                          · {entry.maxAttendees - attendees.length} available
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {loadingAttendees ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-10 animate-pulse rounded-md bg-muted/60"
                      />
                    ))}
                  </div>
                ) : attendees.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No attendees yet. Be the first to join this session.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {attendees.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">
                            {beautifyName(a.name)}
                          </span>
                          {(isAdmin || entry.userId === user?.id) && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              {a.email}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(a.id)}
                          disabled={removingId === a.id || removedId === a.id}
                          className="ml-2 shrink-0 rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none"
                          title="Remove attendee"
                        >
                          {removingId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : removedId === a.id ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ─── Join Section (sitter only) ─── */}
                <div className="mt-4 border-t border-border pt-4">
                  <h4 className="mb-2.5 text-sm font-semibold text-foreground">
                    Join as Breather
                  </h4>
                  <div className="space-y-1.5">
                    {user ? (
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Joining as <span className="font-medium text-foreground">{beautifyName(user.displayName) || user.email}</span>
                      </p>
                    ) : (
                      <>
                        <input
                          value={joinName}
                          onChange={(e) => setJoinName(e.target.value)}
                          className={inputCls}
                          placeholder="Your name"
                        />
                        <input
                          type="email"
                          value={joinEmail}
                          onChange={(e) => setJoinEmail(e.target.value)}
                          className={inputCls}
                          placeholder="your@email.com"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleAddAttendee}
                      disabled={!joinName.trim() || !joinEmail.trim() || isAdding}
                      className="w-full flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {isAdding ? 'Joining…' : 'Join as Breather'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
