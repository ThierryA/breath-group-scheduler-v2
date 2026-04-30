import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { format } from 'date-fns'
import {
  CalendarDays,
  Clock3,
  Pencil,
  UserPlus,
  Users,
  ChevronDown,
  CheckCircle2,
  Repeat,
  Link2,
  Mail,
} from 'lucide-react'
import type { AvailabilityEntry } from '@/features/availability/api'
import type { SessionAttendee } from '@/features/availability/attendees-api'
import { addAttendee } from '@/features/availability/attendees-api'
import toast from 'react-hot-toast'
import { AddToCalendarButton } from './AddToCalendarButton'
import {
  entryDisplayDate,
  entryDisplayTimes,
  formatTime12h,
} from '@/features/availability/utils/calendarHelpers'
import { cn } from '@/lib/utils'
import { beautifyName } from '@/features/availability/utils/nameHelpers'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TimelineScheduleProps {
  isLoading?: boolean
  entries: AvailabilityEntry[]
  allEntries: AvailabilityEntry[]
  allAttendees: SessionAttendee[]
  displayTimezone: string
  attendeeCounts: Record<string, number>
  selectedDate: string
  roleFilter?: 'all' | 'sitter' | 'breather'
  onViewEntry: (entry: AvailabilityEntry) => void
  onEditEntry: (entry: AvailabilityEntry) => void
  onSitSession: (entry: AvailabilityEntry) => void
  onJoinSuccess?: () => void
  user?: { id: string; email: string; displayName?: string | null } | null
  canEdit?: (entry: AvailabilityEntry) => boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function todayInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function tzAbbreviation(tz: string): string {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).format(new Date())
    return f.split(' ').pop() ?? tz
  } catch { return tz }
}

function timesOverlap(aS: string, aE: string, bS: string, bE: string) {
  return aS < bE && bS < aE
}

/* ------------------------------------------------------------------ */
/*  Card sub-components                                                */
/* ------------------------------------------------------------------ */

function RolePill({ role }: { role: 'breather' | 'sitter' }) {
  const isBreather = role === 'breather'
  return (
    <span className={cn(
      'rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]',
      isBreather ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
    )}>
      {isBreather ? 'Breather' : 'Sitter'}
    </span>
  )
}

function SeatsBadge({ count, max }: { count: number; max: number | null }) {
  const isFull = max !== null && count >= max
  if (isFull) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[10px] font-semibold text-destructive">
        <Users className="h-3 w-3" />Full ({count}/{max})
      </span>
    )
  }
  if (max !== null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
        <Users className="h-3 w-3" />{count}/{max} seats
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
      <Users className="h-3 w-3" />
      {count === 0 ? 'No breathers' : `${count} breather${count !== 1 ? 's' : ''}`}
    </span>
  )
}

function SessionTime({ startTime, endTime, timezone }: { startTime: string; endTime: string; timezone: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="h-3.5 w-3.5" />{formatTime12h(startTime)} – {formatTime12h(endTime)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5" />{tzAbbreviation(timezone)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline Join Dropdown (sitter cards only, signed-in users only)     */
/* ------------------------------------------------------------------ */

function JoinDropdown({
  entryId,
  isOpen,
  onClose,
  onSuccess,
  user,
  triggerRef,
}: {
  entryId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  user: { id: string; email: string; displayName?: string | null }
  triggerRef: RefObject<HTMLButtonElement>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      // Ignore clicks on the trigger button itself — it handles its own toggle
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  async function handleJoin() {
    setSubmitting(true)
    try {
      await addAttendee(entryId, (user.displayName || user.email.split('@')[0]).trim(), user.email.trim())
      setJoined(true)
      onSuccess?.()
      // Auto-close after showing success briefly
      setTimeout(() => {
        onClose()
        setJoined(false)
      }, 1800)
    } catch {
      toast.error('Failed to join. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div ref={containerRef} className="mt-2.5">
      <div
        onClick={(e) => e.stopPropagation()}
        className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3"
      >
        {joined ? (
          <div className="flex items-center gap-2 rounded-md bg-accent/10 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm font-medium text-accent">You've joined the session!</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Joining as <span className="font-medium text-foreground">{beautifyName(user.displayName) || user.email}</span>
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleJoin}
              className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Joining…' : 'Confirm join'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Session Card                                                       */
/* ------------------------------------------------------------------ */

function SessionCard({
  entry,
  times,
  attendeeCount,
  displayTimezone,
  allEntries,
  allAttendees,
  sitterOptions,
  attendeeCounts,
  expandedId,
  setExpandedId,
  onViewEntry,
  onEditEntry,
  onSitSession,
  onJoinSuccess,
  user,
  canEdit,
  showSitterSessions,
}: {
  entry: AvailabilityEntry
  times: { startTime: string; endTime: string }
  attendeeCount: number
  displayTimezone: string
  allEntries: AvailabilityEntry[]
  allAttendees: SessionAttendee[]
  sitterOptions: AvailabilityEntry[]
  attendeeCounts: Record<string, number>
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  showSitterSessions?: boolean
  onViewEntry: (entry: AvailabilityEntry) => void
  onEditEntry: (entry: AvailabilityEntry) => void
  onSitSession: (entry: AvailabilityEntry) => void
  onJoinSuccess?: () => void
  user?: { id: string; email: string; displayName?: string | null } | null
  canEdit?: (entry: AvailabilityEntry) => boolean
}) {
  const isBreather = entry.role === 'breather'
  const isExpanded = expandedId === entry.id
  const isFull = !isBreather && entry.maxAttendees !== null && attendeeCount >= (entry.maxAttendees ?? 0)

  const linkedSitter = useMemo(() => {
    if (!isBreather) return null
    const breatherDate = entryDisplayDate(entry, displayTimezone)
    return allEntries.find((sitter) => {
      if (sitter.role !== 'sitter') return false
      if (entryDisplayDate(sitter, displayTimezone) !== breatherDate) return false
      if (!timesOverlap(entry.startTime, entry.endTime, sitter.startTime, sitter.endTime)) return false
      return allAttendees.some(
        (a) => a.entryId === sitter.id && a.email.toLowerCase() === (entry.email ?? '').toLowerCase()
      )
    }) ?? null
  }, [isBreather, entry, allEntries, allAttendees, displayTimezone])

  const joinButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <article
      className={cn(
        'group relative rounded-md border bg-background/90 px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden min-w-0 w-full',
        isBreather ? 'border-primary/15' : 'border-accent/15',
        isFull && 'opacity-80'
      )}
    >
      {/* Top-right action buttons */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        {/* Copy link button — always visible on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const url = `${window.location.origin}${window.location.pathname}?entry=${entry.id}`
            navigator.clipboard.writeText(url).then(() => {
              toast.success('Link copied!', { duration: 2000 })
            })
          }}
          className={cn(
            'rounded-full p-1.5 transition',
            'text-muted-foreground/50 hover:bg-muted hover:text-foreground',
            'opacity-0 group-hover:opacity-100 focus:opacity-100'
          )}
          title="Copy link to session"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        {/* Edit button – only for signed-in users who own the entry */}
        {user && (!canEdit || canEdit(entry)) && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditEntry(entry) }}
            className={cn(
              'rounded-full p-1.5 transition',
              'text-muted-foreground/60 hover:bg-muted hover:text-foreground',
              'opacity-0 group-hover:opacity-100 focus:opacity-100'
            )}
            title="Edit session"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Clickable content area */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onViewEntry(entry)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewEntry(entry) } }}
        className="cursor-pointer"
      >
        {/* Role pill + badges */}
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <RolePill role={entry.role} />
          {!isBreather && <SeatsBadge count={attendeeCount} max={entry.maxAttendees ?? null} />}
          {entry.recurringGroupId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              <Repeat className="h-3 w-3" />Recurring
            </span>
          )}
        </div>

        <h4 className="mt-2.5 text-base font-semibold leading-snug text-foreground">{beautifyName(entry.name)}</h4>
        <SessionTime startTime={times.startTime} endTime={times.endTime} timezone={displayTimezone} />
        {entry.notes && (
          <p className="mt-2 text-sm leading-relaxed text-foreground/70 line-clamp-2 break-words">{entry.notes}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 min-w-0">
        {!isBreather ? (
          /* Sitter card actions */
          <>
            {user && (
              <button
                ref={joinButtonRef}
                type="button"
                disabled={isFull}
                onClick={(e) => { e.stopPropagation(); if (!isFull) setExpandedId(isExpanded ? null : entry.id) }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition',
                  isFull
                    ? 'border-border/30 text-muted-foreground cursor-not-allowed opacity-50'
                    : isExpanded
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-accent/30 text-accent hover:bg-accent/10'
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isFull ? 'Session full' : 'Join as Breather'}
                {!isFull && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />}
              </button>
            )}
            <div onClick={(e) => e.stopPropagation()}>
              <AddToCalendarButton entry={entry} />
            </div>
          </>
        ) : (
          /* Breather card actions */
          <div className="w-full space-y-2" onClick={(e) => e.stopPropagation()}>
            {linkedSitter && (
              <button
                type="button"
                onClick={() => onViewEntry(linkedSitter)}
                className="w-full flex items-center gap-2 rounded-md border border-accent/30 bg-accent/[0.08] px-3 py-2 text-left transition hover:bg-accent/15 hover:border-accent/50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="flex-1 text-xs text-accent">
                <span className="font-medium">{beautifyName(entry.name).split(' ')[0]}</span>
                {' is already attending '}
                <span className="font-medium">{beautifyName(linkedSitter.name).split(' ')[0]}</span>
                  {"'s session"}
                  <span className="ml-1 underline underline-offset-2">View →</span>
                </span>
              </button>
            )}
            {showSitterSessions && sitterOptions.length > 0 && !linkedSitter && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Sitters available on this day
                </p>
                {sitterOptions.map((s) => {
                  const sCount = attendeeCounts[s.id] ?? 0
                  const sFull = s.maxAttendees !== null && sCount >= (s.maxAttendees ?? 0)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onViewEntry(s)}
                      className="w-full flex items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-left transition hover:bg-accent/10 hover:border-accent/40"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-medium text-foreground">{beautifyName(s.name)}</span>
                        <span className="text-[11px] text-muted-foreground">{formatTime12h(s.startTime)} – {formatTime12h(s.endTime)}</span>
                      </div>
                      <div className="shrink-0">
                        {sFull ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Full</span>
                        ) : s.maxAttendees !== null ? (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">{sCount}/{s.maxAttendees}</span>
                        ) : (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">{sCount} joined</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {/* Inline action row: Create sitter + Add to Calendar side by side */}
            <div className="flex flex-wrap items-center gap-2">
              {user && (
                <button
                  type="button"
                  onClick={() => onSitSession(entry)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10"
                >
                  <UserPlus className="h-3.5 w-3.5" />Create sitter session
                </button>
              )}
              <AddToCalendarButton entry={entry} />
            </div>
          </div>
        )}
      </div>

      {/* Attendee list — sitter cards with at least one attendee */}
      {!isBreather && attendeeCount > 0 && (() => {
        const cardAttendees = allAttendees.filter((a) => a.entryId === entry.id)
        if (cardAttendees.length === 0) return null
        return (
          <div className="mt-3 border-t border-border/40 pt-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Attendees</p>
            <ul className="space-y-1">
              {cardAttendees.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs text-foreground/80">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
                    {beautifyName(a.name).charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate font-medium">{beautifyName(a.name)}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      {/* Join dropdown (sitter cards, signed-in only) */}
      {!isBreather && user && (
        <JoinDropdown
          entryId={entry.id}
          isOpen={isExpanded}
          onClose={() => setExpandedId(null)}
          onSuccess={onJoinSuccess}
          user={user}
          triggerRef={joinButtonRef}
        />
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function TimelineSchedule({
  isLoading,
  entries,
  allEntries,
  allAttendees,
  displayTimezone,
  attendeeCounts,
  selectedDate,
  onViewEntry,
  onEditEntry,
  onSitSession,
  onJoinSuccess,
  user,
  canEdit,
  roleFilter,
}: TimelineScheduleProps) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleDays, setVisibleDays] = useState(7)
  const todayKey = useMemo(() => todayInTimezone(displayTimezone), [displayTimezone])

  const sittersByDate = useMemo(() => {
    const map: Record<string, AvailabilityEntry[]> = {}
    for (const e of allEntries) {
      if (e.role !== 'sitter') continue
      const dk = entryDisplayDate(e, displayTimezone)
      if (!map[dk]) map[dk] = []
      map[dk].push(e)
    }
    return map
  }, [allEntries, displayTimezone])

  const groupedEntries = useMemo(() => {
    const future = entries
      .map((entry) => ({ entry, dateKey: entryDisplayDate(entry, displayTimezone), times: entryDisplayTimes(entry, displayTimezone) }))
      .filter(({ dateKey }) => dateKey >= todayKey)
      .sort((a, b) => {
        // Sort sitters first within each date, then by time
        if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey)
        if (a.entry.role !== b.entry.role) return a.entry.role === 'sitter' ? -1 : 1
        return `${a.times.startTime}`.localeCompare(`${b.times.startTime}`)
      })

    return future.reduce<Array<{ dateKey: string; items: typeof future }>>((acc, item) => {
      const existing = acc[acc.length - 1]
      if (existing?.dateKey === item.dateKey) existing.items.push(item)
      else acc.push({ dateKey: item.dateKey, items: [item] })
      return acc
    }, [])
  }, [displayTimezone, entries, todayKey])

  // Reset visible window when underlying data changes (e.g. filter toggle)
  const groupCount = groupedEntries.length
  useEffect(() => {
    setVisibleDays(7)
  }, [groupCount])

  const visibleGroups = useMemo(() => groupedEntries.slice(0, visibleDays), [groupedEntries, visibleDays])
  const hasMore = visibleDays < groupedEntries.length

  // Infinite-scroll: load 7 more days when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleDays((prev) => Math.min(prev + 7, groupedEntries.length))
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, groupedEntries.length])

  // Scroll to selected date — only when selectedDate changes (not when visibleDays increments)
  const prevSelectedDate = useRef<string | null>(null)
  useEffect(() => {
    if (prevSelectedDate.current === selectedDate) return
    prevSelectedDate.current = selectedDate

    const targetIdx = groupedEntries.findIndex((g) => g.dateKey === selectedDate)
    if (targetIdx === -1) return

    if (targetIdx >= visibleDays) {
      setVisibleDays(targetIdx + 3)
      // Wait for React to re-render with the expanded groups before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = sectionRefs.current[selectedDate]
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      })
    } else {
      const target = sectionRefs.current[selectedDate]
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedDate, groupedEntries]) // intentionally excludes visibleDays — adding it causes scroll-to-top on every infinite scroll load

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border/60 px-6 py-12 text-center">
        <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading sessions…</p>
      </section>
    )
  }

  if (groupedEntries.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border/60 px-6 py-12 text-center">
        <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No upcoming sessions yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Add the first one to start the timeline.</p>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      {visibleGroups.map((group) => (
        <div key={group.dateKey} ref={(node) => { sectionRefs.current[group.dateKey] = node }} style={{ scrollMarginTop: '105px' }}>
          <h3 className="mb-3 font-serif text-sm font-semibold text-foreground/70">
            {format(new Date(`${group.dateKey}T00:00:00`), 'EEEE, MMMM d')}
            {group.dateKey === todayKey && <span className="ml-2 text-xs font-normal text-primary">Today</span>}
          </h3>

          <div className="relative border-l-2 border-border/50 pl-6 min-w-0">
            <div className="grid gap-3 min-w-0">
              {group.items.map(({ entry, times }) => {
                const attendeeCount = attendeeCounts[entry.id] ?? 0
                const isBreather = entry.role === 'breather'
                const itemDotColor = isBreather ? 'bg-primary' : 'bg-accent'
                const sitterOptions = isBreather
                  ? (sittersByDate[group.dateKey] ?? []).filter((s) => {
                      const st = entryDisplayTimes(s, displayTimezone)
                      return times.startTime < st.endTime && st.startTime < times.endTime
                    })
                  : []
                const showSitterSessions = isBreather

                return (
                  <div key={entry.id} className="relative">
                    <div className={cn('absolute -left-[1.9rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm', itemDotColor)} />
                    <SessionCard
                      entry={entry}
                      times={times}
                      attendeeCount={attendeeCount}
                      displayTimezone={displayTimezone}
                      allEntries={allEntries}
                      allAttendees={allAttendees}
                      sitterOptions={sitterOptions}
                      attendeeCounts={attendeeCounts}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      onViewEntry={onViewEntry}
                      onEditEntry={onEditEntry}
                      onSitSession={onSitSession}
                      onJoinSuccess={onJoinSuccess}
                      user={user}
                      canEdit={canEdit}
                      showSitterSessions={showSitterSessions}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            Loading more sessions…
          </div>
        </div>
      )}
    </section>
  )
}