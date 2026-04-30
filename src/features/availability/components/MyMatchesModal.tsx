import { useState, useCallback } from 'react'
import { X, Wind, Hand, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { addAttendee } from '@/features/availability/attendees-api'
import { formatTime12h } from '@/features/availability/utils/calendarHelpers'
import { beautifyName } from '@/features/availability/utils/nameHelpers'
import toast from 'react-hot-toast'

export interface MatchSitter {
  /** The sitter session entry */
  sitterId: string
  sitterName: string
  sitterDate: string    // YYYY-MM-DD in display tz
  sitterStart: string   // HH:mm
  sitterEnd: string     // HH:mm
  sitterMax: number | null
  sitterCount: number
  alreadyJoined: boolean
  /** The user's breather session that overlaps */
  breatherId: string
  breatherName: string
}

export interface MatchBreather {
  /** The breather session that needs a sitter */
  breatherId: string
  breatherName: string
  breatherDate: string
  breatherStart: string
  breatherEnd: string
  /** The user's sitter session that overlaps */
  sitterId: string
  sitterName: string
}

interface MyMatchesModalProps {
  open: boolean
  onClose: () => void
  sitterMatches: MatchSitter[]    // open sitters for my breather slots
  breatherMatches: MatchBreather[] // breathers needing my sitter slots
  user: { id: string; email: string; displayName?: string | null }
  onJoinSuccess: () => void
  onViewEntry: (id: string) => void
}

function fmtDate(d: string) {
  try { return format(new Date(`${d}T00:00:00`), 'EEE, MMM d') }
  catch { return d }
}

function CapacityPill({ count, max }: { count: number; max: number | null }) {
  if (max === null) return null
  const full = count >= max
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[10px] font-medium',
      full ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
    )}>
      {count}/{max}
    </span>
  )
}

function SitterMatchRow({
  match,
  user,
  onJoinSuccess,
  onView,
}: {
  match: MatchSitter
  user: { id: string; email: string; displayName?: string | null }
  onJoinSuccess: () => void
  onView: (id: string) => void
}) {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(match.alreadyJoined)

  const isFull = match.sitterMax !== null && match.sitterCount >= match.sitterMax

  const handleJoin = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (joining || joined || isFull) return
    setJoining(true)
    try {
      await addAttendee(
        match.sitterId,
        (user.displayName || user.email.split('@')[0]).trim(),
        user.email.trim()
      )
      setJoined(true)
      onJoinSuccess()
      toast.success('Joined! See you there.')
    } catch {
      toast.error('Could not join. Please try again.')
    } finally {
      setJoining(false)
    }
  }, [joining, joined, isFull, match.sitterId, user, onJoinSuccess])

  return (
    <div className="rounded-lg border border-accent/15 bg-accent/[0.04] p-3">
      {/* Breather context */}
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Wind className="h-3 w-3 text-primary" />
        Your breather slot — {beautifyName(match.breatherName)}
      </p>

      {/* Sitter row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onView(match.sitterId)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-foreground">
            {beautifyName(match.sitterName)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fmtDate(match.sitterDate)} · {formatTime12h(match.sitterStart)} – {formatTime12h(match.sitterEnd)}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <CapacityPill count={match.sitterCount} max={match.sitterMax} />

          {joined ? (
            <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">
              <CheckCircle2 className="h-3 w-3" />
              Joined
            </span>
          ) : isFull ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Full
            </span>
          ) : (
            <button
              type="button"
              disabled={joining}
              onClick={handleJoin}
              className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onView(match.sitterId)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="View session"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function BreatherMatchRow({
  match,
  onView,
}: {
  match: MatchBreather
  onView: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onView(match.breatherId)}
      className="w-full rounded-lg border border-primary/15 bg-primary/[0.04] p-3 text-left transition hover:bg-primary/[0.08]"
    >
      {/* Sitter context */}
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Hand className="h-3 w-3 text-accent" />
        Your sitter session — {beautifyName(match.sitterName)}
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {beautifyName(match.breatherName)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fmtDate(match.breatherDate)} · {formatTime12h(match.breatherStart)} – {formatTime12h(match.breatherEnd)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  )
}

export function MyMatchesModal({
  open,
  onClose,
  sitterMatches,
  breatherMatches,
  user,
  onJoinSuccess,
  onViewEntry,
}: MyMatchesModalProps) {
  if (!open) return null

  const total = sitterMatches.length + breatherMatches.length

  const header = (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="font-semibold text-foreground">My Matches</h2>
        {total > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">
            {total}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  const body = (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
      {total === 0 && (
        <div className="py-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No matches yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your availability and matches will appear here when others overlap.
          </p>
        </div>
      )}

      {sitterMatches.length > 0 && (
        <section>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Wind className="h-3.5 w-3.5 text-primary" />
            Open sitters for your breather slots
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {sitterMatches.length}
            </span>
          </p>
          <div className="space-y-2">
            {sitterMatches.map((m) => (
              <SitterMatchRow
                key={`${m.breatherId}-${m.sitterId}`}
                match={m}
                user={user}
                onJoinSuccess={onJoinSuccess}
                onView={onViewEntry}
              />
            ))}
          </div>
        </section>
      )}

      {breatherMatches.length > 0 && (
        <section>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Hand className="h-3.5 w-3.5 text-accent" />
            Breathers who could use your sitter sessions
            <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              {breatherMatches.length}
            </span>
          </p>
          <div className="space-y-2">
            {breatherMatches.map((m) => (
              <BreatherMatchRow
                key={`${m.sitterId}-${m.breatherId}`}
                match={m}
                onView={onViewEntry}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile: full-screen panel (same pattern as MobileUserPanel / notifications) */}
      <div className="fixed inset-x-0 top-0 bottom-0 z-[70] flex flex-col bg-background animate-in fade-in-0 slide-in-from-top-2 sm:hidden">
        {header}
        {body}
      </div>

      {/* Desktop: backdrop + centered modal */}
      <div className="hidden sm:block">
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div className="fixed left-1/2 top-1/2 z-[61] flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-background shadow-xl max-h-[80vh]">
          {header}
          {body}
        </div>
      </div>
    </>
  )
}
