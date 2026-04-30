import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users, UserPlus, Upload, Shield, Trash2, Ban, CheckCircle,
  ChevronLeft, AlertTriangle, CalendarDays, UserCheck,
  Wind, Hand, BarChart2, Bell, Sparkles, X, ChevronRight,
  Loader2, Mail, Inbox, Search, RefreshCw, CircleX, CircleCheck,
  Filter,
} from 'lucide-react'
import {
  listMembers, createMember, updateMember, removeMember,
  type AppMember, type AppRole, type Capabilities,
} from '@/features/members/api'
import { cn } from '@/lib/utils'
import { blink } from '@/blink/client'

const MEMBERS_QK = ['appMembers']
const ANALYTICS_QK = ['adminAnalyticsSDK']
const EMAIL_LOG_QK = ['emailLog']
const BACKEND = 'https://60lyovrv.backend.blink.new'

export interface EmailLogEntry {
  id: string
  sentAt: string
  toEmail: string
  subject: string
  type: string
  status: 'sent' | 'failed'
  error: string | null
  memberId: string | null
}

const TYPE_LABELS: Record<string, string> = {
  welcome: 'Welcome',
  resend_welcome: 'Resend Welcome',
  access_request: 'Access Request',
  session_event: 'Session Event',
}

const TYPE_COLORS: Record<string, string> = {
  welcome: 'bg-emerald-100 text-emerald-700',
  resend_welcome: 'bg-sky-100 text-sky-700',
  access_request: 'bg-amber-100 text-amber-700',
  session_event: 'bg-primary/10 text-primary',
}

async function fetchEmailLog(): Promise<EmailLogEntry[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${BACKEND}/api/email-log`, { signal: controller.signal })
    if (!res.ok) throw new Error(`${res.status}`)
    const rows = await res.json() as any[]
    return rows.map((r) => ({
      id: r.id,
      sentAt: r.sentAt ?? r.sent_at,
      toEmail: r.toEmail ?? r.to_email,
      subject: r.subject,
      type: r.type,
      status: r.status,
      error: r.error ?? null,
      memberId: r.memberId ?? r.member_id ?? null,
    }))
  } finally {
    clearTimeout(timer)
  }
}

const ROLE_LABELS: Record<AppRole, string> = { admin: 'Admin', member: 'Member' }
const CAP_LABELS: Record<Capabilities, string> = {
  both: 'Sitter & Breather',
  sitter: 'Sitter only',
  breather: 'Breather only',
}
const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-muted text-muted-foreground',
  active: 'bg-accent/10 text-accent',
  blocked: 'bg-destructive/10 text-destructive',
  requested: 'bg-amber-100 text-amber-700',
}

/* ── Analytics fetch via Blink SDK ── */
/* ── Drill-down item types ── */
interface DrillItem {
  id: string
  primary: string
  secondary?: string
  tertiary?: string
  badge?: { label: string; color: string }
}

interface AnalyticsResult {
  activeMembers: number
  invitedMembers: number
  totalSessions: number
  sitterSessions: number
  breatherSessions: number
  sessionsWithAttendees: number
  totalAttendees: number
  avgAttendeesPerSitter: number
  pushSubscribers: number
  opportunities: number
  // Detail lists for drill-down
  activeMemberList: DrillItem[]
  invitedMemberList: DrillItem[]
  sitterList: DrillItem[]
  breatherList: DrillItem[]
  sitterWithAttendeesList: DrillItem[]
  opportunityList: DrillItem[]
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

async function fetchAnalyticsSDK(): Promise<AnalyticsResult> {
  const [members, entries, attendees, pushSubs, userRows] = await Promise.all([
    blink.db.appMembers.list(),
    blink.db.availabilityEntries.list(),
    blink.db.sessionAttendees.list(),
    blink.db.pushSubscriptions.list(),
    blink.db.users.list(),
  ])

  // last_sign_in by email
  const signInByEmail = new Map<string, string>()
  for (const u of userRows as { email: string; lastSignIn?: string | null }[]) {
    if (u.email && u.lastSignIn) signInByEmail.set(u.email.toLowerCase(), u.lastSignIn)
  }

  const activeMemberRows = (members as any[]).filter((m) => m.status === 'active')
  const invitedMemberRows = (members as any[]).filter((m) => m.status === 'invited')
  const activeMembers = activeMemberRows.length
  const invitedMembers = invitedMemberRows.length

  const activeMemberList: DrillItem[] = activeMemberRows.map((m) => {
    const lastSeen = signInByEmail.get(m.email?.toLowerCase())
    return {
      id: m.id,
      primary: m.email,
      secondary: lastSeen ? `Last seen ${new Date(lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Never signed in',
      badge: { label: m.capabilities === 'both' ? 'Sitter & Breather' : m.capabilities === 'sitter' ? 'Sitter' : 'Breather', color: 'bg-accent/10 text-accent' },
    }
  })

  const invitedMemberList: DrillItem[] = invitedMemberRows.map((m) => ({
    id: m.id,
    primary: m.email,
    secondary: `Invited ${new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
  }))

  const sitterEntries = (entries as any[]).filter((e) => e.role === 'sitter')
  const breatherEntries = (entries as any[]).filter((e) => e.role === 'breather')
  const totalSessions = entries.length
  const sitterSessions = sitterEntries.length
  const breatherSessions = breatherEntries.length

  const sitterList: DrillItem[] = sitterEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      id: e.id,
      primary: e.name,
      secondary: `${fmtDate(e.date)} · ${fmtTime(e.startTime)} – ${fmtTime(e.endTime)}`,
      tertiary: e.notes || undefined,
    }))

  const breatherList: DrillItem[] = breatherEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      id: e.id,
      primary: e.name,
      secondary: `${fmtDate(e.date)} · ${fmtTime(e.startTime)} – ${fmtTime(e.endTime)}`,
      tertiary: e.notes || undefined,
    }))

  // Attendees per sitter
  const attendeesBySitter: Record<string, number> = {}
  for (const a of attendees as any[]) {
    const eid = a.entryId ?? a.entry_id
    attendeesBySitter[eid] = (attendeesBySitter[eid] ?? 0) + 1
  }

  const entryIdsWithAttendees = new Set(Object.keys(attendeesBySitter))
  const sessionsWithAttendees = entryIdsWithAttendees.size
  const totalAttendees = (attendees as any[]).length
  const avgAttendeesPerSitter = sitterSessions > 0 ? Math.round((totalAttendees / sitterSessions) * 10) / 10 : 0

  const sitterWithAttendeesList: DrillItem[] = sitterEntries
    .filter((e) => entryIdsWithAttendees.has(e.id))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const count = attendeesBySitter[e.id] ?? 0
      const max = e.maxAttendees != null ? Number(e.maxAttendees) : null
      return {
        id: e.id,
        primary: e.name,
        secondary: `${fmtDate(e.date)} · ${fmtTime(e.startTime)} – ${fmtTime(e.endTime)}`,
        badge: { label: max ? `${count}/${max} breathers` : `${count} breather${count !== 1 ? 's' : ''}`, color: 'bg-teal-50 text-teal-700' },
      }
    })

  const pushSubscribers = (pushSubs as any[]).length

  // Build a lookup: sitter entry id → set of attendee emails already joined
  const attendeeEmailsBySitter: Record<string, Set<string>> = {}
  for (const a of attendees as any[]) {
    const eid = a.entryId ?? a.entry_id
    if (!attendeeEmailsBySitter[eid]) attendeeEmailsBySitter[eid] = new Set()
    if (a.email) attendeeEmailsBySitter[eid].add(a.email.toLowerCase().trim())
  }

  // Opportunities: future breather sessions where the breather is NOT already attending
  // any overlapping sitter session that still has capacity
  const openSitters = sitterEntries.filter((s) => {
    const max = s.maxAttendees == null ? null : Number(s.maxAttendees)
    if (max === null || max === 0) return true
    return (attendeesBySitter[s.id] ?? 0) < max
  })
  const today = new Date().toISOString().slice(0, 10)
  const opportunityList: DrillItem[] = []
  for (const b of breatherEntries) {
    if (b.date < today) continue
    const breatherEmail = (b.email ?? '').toLowerCase().trim()

    // Open sitters on same date with overlapping time where this breather is NOT already attending
    const genuinelyOpen = openSitters.filter((s) => {
      if (s.date !== b.date) return false
      if (b.startTime >= s.endTime || s.startTime >= b.endTime) return false
      // Exclude if the breather already joined this specific sitter session
      const joined = attendeeEmailsBySitter[s.id]
      if (breatherEmail && joined?.has(breatherEmail)) return false
      return true
    })

    if (genuinelyOpen.length > 0) {
      opportunityList.push({
        id: b.id,
        primary: b.name,
        secondary: `${fmtDate(b.date)} · ${fmtTime(b.startTime)} – ${fmtTime(b.endTime)}`,
        tertiary: `${genuinelyOpen.length} open sitter slot${genuinelyOpen.length !== 1 ? 's' : ''}: ${genuinelyOpen.map((s) => s.name).join(', ')}`,
        badge: { label: 'Unmatched', color: 'bg-amber-50 text-amber-700' },
      })
    }
  }

  return {
    activeMembers,
    invitedMembers,
    totalSessions,
    sitterSessions,
    breatherSessions,
    sessionsWithAttendees,
    totalAttendees,
    avgAttendeesPerSitter,
    pushSubscribers,
    opportunities: opportunityList.length,
    activeMemberList,
    invitedMemberList,
    sitterList,
    breatherList,
    sitterWithAttendeesList,
    opportunityList,
  }
}

/* ── Drill-down modal ── */
function DrillModal({
  title,
  items,
  onClose,
}: {
  title: string
  items: DrillItem[]
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-lg max-h-[85dvh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-xl border border-border bg-background shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{items.length}</span>
            <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* List */}
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">Nothing to show</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.primary}</p>
                      {item.secondary && <p className="mt-0.5 text-[12px] text-muted-foreground">{item.secondary}</p>}
                      {item.tertiary && <p className="mt-0.5 text-[11px] text-muted-foreground/80 italic">{item.tertiary}</p>}
                    </div>
                    {item.badge && (
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap', item.badge.color)}>
                        {item.badge.label}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Stat card ── */
function StatCard({
  icon,
  label,
  value,
  sub,
  iconClass = 'text-primary',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  iconClass?: string
  onClick?: () => void
}) {
  const isClickable = !!onClick
  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
      className={cn(
        'bg-muted/10 border border-border rounded-xl p-5 flex flex-col gap-3',
        isClickable && 'cursor-pointer transition hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm group',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10', iconClass)}>
          {icon}
        </span>
        {isClickable && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition" />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

/* ── Analytics skeleton ── */
function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-muted/10 border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

/* ── Confirm remove dialog ── */
function RemoveConfirmDialog({
  member,
  onConfirm,
  onCancel,
}: {
  member: AppMember
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h3 className="font-semibold text-foreground">Remove member?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">{member.email}</span> and all their sessions and attendee records. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition hover:bg-muted">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Pending request row (needs own component for hooks) ── */
function PendingRequestRow({
  member,
  onDecline,
  declineLoading,
  onAccepted,
}: {
  member: AppMember
  onDecline: () => void
  declineLoading: boolean
  onAccepted: () => void
}) {
  const [acceptLoading, setAcceptLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  async function handleAccept() {
    setAcceptLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/member-requests/${member.id}/accept`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      onAccepted()
      toast.success('Member approved! Welcome email sent.')
    } catch {
      toast.error('Failed to approve member')
    } finally {
      setAcceptLoading(false)
    }
  }

  async function handleResend() {
    setResendLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/members/${member.id}/resend-welcome`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      setResendDone(true)
      toast.success('Welcome email resent!')
      setTimeout(() => setResendDone(false), 4000)
    } catch {
      toast.error('Failed to resend email')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <tr className="border-b border-amber-100 dark:border-amber-900/20 last:border-0 text-sm">
      <td className="py-3 pl-5 pr-3 font-medium text-foreground">{member.email}</td>
      <td className="px-3 py-3 text-muted-foreground text-xs">
        {member.createdAt
          ? new Date(member.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'}
      </td>
      <td className="py-3 pl-3 pr-5">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={acceptLoading}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {acceptLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
            Accept
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendDone}
            title="Resend welcome email"
            className={cn(
              'flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
              resendDone
                ? 'border-accent/30 text-accent bg-accent/10'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
            )}
          >
            {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : resendDone ? <CheckCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
            {resendDone ? 'Sent!' : 'Resend'}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={declineLoading}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" />Decline
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ── Member row ── */
function MemberRow({
  member,
  onBlock,
  onUnblock,
  onRemove,
  onRoleChange,
  onCapChange,
  isCurrentUser,
}: {
  member: AppMember
  onBlock: () => void
  onUnblock: () => void
  onRemove: () => void
  onRoleChange: (role: AppRole) => void
  onCapChange: (cap: Capabilities) => void
  isCurrentUser: boolean
}) {
  const [blockLoading, setBlockLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  async function handleBlock() {
    setBlockLoading(true)
    try { await Promise.resolve(onBlock()) } finally { setBlockLoading(false) }
  }

  async function handleUnblock() {
    setBlockLoading(true)
    try { await Promise.resolve(onUnblock()) } finally { setBlockLoading(false) }
  }

  const [sentCount, setSentCount] = useState(member.welcomeEmailCount ?? 0)

  async function handleResendWelcome() {
    setResendLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/members/${member.id}/resend-welcome`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json().catch(() => ({}))
      setSentCount(data.welcomeEmailCount ?? sentCount + 1)
      setResendDone(true)
      toast.success('Welcome email resent!')
      setTimeout(() => setResendDone(false), 4000)
    } catch {
      toast.error('Failed to resend email')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <tr className={cn('border-b border-border/60 text-sm transition hover:bg-muted/30', member.status === 'blocked' && 'opacity-60')}>
      <td className="py-3 pl-4 pr-3">
        <div>
          <span className="font-medium text-foreground">{member.email}</span>
          {isCurrentUser && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">You</span>}
          {member.lastSignIn ? (
            <span className="block text-[11px] text-muted-foreground mt-0.5">
              Last seen {new Date(member.lastSignIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground/50 mt-0.5">Never signed in</span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <select
          value={member.appRole}
          disabled={isCurrentUser}
          onChange={(e) => onRoleChange(e.target.value as AppRole)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none transition focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={member.capabilities}
          onChange={(e) => onCapChange(e.target.value as Capabilities)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none transition focus:ring-1 focus:ring-ring"
        >
          <option value="both">Sitter & Breather</option>
          <option value="sitter">Sitter only</option>
          <option value="breather">Breather only</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize', STATUS_COLORS[member.status] ?? STATUS_COLORS.invited)}>
          {member.status}
        </span>
      </td>
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Resend welcome — only for non-blocked members */}
          {member.status !== 'blocked' && (
            <button
              type="button"
              onClick={handleResendWelcome}
              disabled={resendLoading || resendDone}
              title="Resend welcome email"
              className={cn(
                'flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
                resendDone
                  ? 'border-accent/30 text-accent bg-accent/10'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
              )}
            >
              {resendLoading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : resendDone
                  ? <CheckCircle className="h-3 w-3" />
                  : <Mail className="h-3 w-3" />}
              {resendDone ? 'Sent!' : sentCount > 0 ? `Resend (×${sentCount})` : 'Resend'}
            </button>
          )}
          {member.status === 'blocked' ? (
            <button
              type="button"
              onClick={handleUnblock}
              disabled={blockLoading}
              title="Unblock"
              className="flex items-center gap-1 rounded-md border border-accent/30 px-2.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {blockLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Unblock
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBlock}
              disabled={isCurrentUser || blockLoading}
              title="Block"
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            >
              {blockLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
              Block
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={isCurrentUser}
            title="Remove"
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />Remove
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ── Sentbox tab ── */
function SentboxTab({
  emailLog,
  isLoading,
  onRefresh,
}: {
  emailLog: EmailLogEntry[]
  isLoading: boolean
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return emailLog.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (q && !e.toEmail.toLowerCase().includes(q) && !e.subject.toLowerCase().includes(q)) return false
      return true
    })
  }, [emailLog, search, typeFilter, statusFilter])

  const counts = useMemo(() => ({
    sent: emailLog.filter((e) => e.status === 'sent').length,
    failed: emailLog.filter((e) => e.status === 'failed').length,
  }), [emailLog])

  return (
    <div>
      {/* Header row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sent Mail</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">All outgoing emails logged by the platform.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      {/* Stats row */}
      {!isLoading && emailLog.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">{emailLog.length}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">{counts.sent} sent</span>
          </div>
          {counts.failed > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <CircleX className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive font-medium">{counts.failed} failed</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by recipient or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none transition focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-ring"
          >
            <option value="all">All types</option>
            <option value="welcome">Welcome</option>
            <option value="resend_welcome">Resend Welcome</option>
            <option value="access_request">Access Request</option>
            <option value="session_event">Session Event</option>
          </select>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Inbox className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {emailLog.length === 0 ? 'No emails logged yet.' : 'No results match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/10">
                  <th className="py-2.5 pl-4 pr-3">Date</th>
                  <th className="px-3 py-2.5">To</th>
                  <th className="px-3 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="py-2.5 pl-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <EmailLogRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
            {filtered.length < emailLog.length && (
              <p className="px-4 py-2 text-center text-xs text-muted-foreground border-t border-border/60">
                Showing {filtered.length} of {emailLog.length} entries
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmailLogRow({ entry }: { entry: EmailLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const isFailed = entry.status === 'failed'

  const date = new Date(entry.sentAt)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/60 last:border-0 text-sm transition hover:bg-muted/20',
          isFailed && 'bg-destructive/3',
          entry.error && 'cursor-pointer',
        )}
        onClick={() => entry.error && setExpanded((v) => !v)}
      >
        <td className="py-3 pl-4 pr-3 text-xs text-muted-foreground whitespace-nowrap">
          <span className="block font-medium text-foreground">{dateStr}</span>
          <span>{timeStr}</span>
        </td>
        <td className="px-3 py-3 text-sm font-medium text-foreground max-w-[180px] truncate">
          {entry.toEmail}
        </td>
        <td className="px-3 py-3 text-sm text-muted-foreground max-w-[240px] truncate" title={entry.subject}>
          {entry.subject}
        </td>
        <td className="px-3 py-3">
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize whitespace-nowrap',
            TYPE_COLORS[entry.type] ?? 'bg-muted text-muted-foreground',
          )}>
            {TYPE_LABELS[entry.type] ?? entry.type}
          </span>
        </td>
        <td className="py-3 pl-3 pr-4">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium',
            isFailed ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-700',
          )}>
            {isFailed ? <CircleX className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
            {isFailed ? 'Failed' : 'Sent'}
          </span>
        </td>
      </tr>
      {expanded && entry.error && (
        <tr className="border-b border-border/60 bg-destructive/5">
          <td colSpan={5} className="px-4 py-3">
            <p className="text-[11px] font-medium text-destructive mb-1">Error detail</p>
            <p className="text-xs text-muted-foreground font-mono break-all">{entry.error}</p>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Main ── */
interface AdminPageProps {
  currentUserEmail: string
  onBack: () => void
}

type DrillKey = 'activeMembers' | 'invitedMembers' | 'sitters' | 'breathers' | 'sitterWithAttendees' | 'opportunities' | null
type AdminTab = 'overview' | 'members' | 'sentbox'

export function AdminPage({ currentUserEmail, onBack }: AdminPageProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<AppRole>('member')
  const [addCap, setAddCap] = useState<Capabilities>('both')
  const [bulkText, setBulkText] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<AppMember | null>(null)
  const [drillKey, setDrillKey] = useState<DrillKey>(null)
  const addEmailRef = useRef<HTMLInputElement>(null)

  const { data: members = [], isLoading } = useQuery({ queryKey: MEMBERS_QK, queryFn: listMembers })
  const { data: emailLog = [], isLoading: emailLogLoading, refetch: refetchEmailLog } = useQuery({
    queryKey: EMAIL_LOG_QK,
    queryFn: fetchEmailLog,
    staleTime: 30_000,
    enabled: tab === 'sentbox',
  })

  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useQuery({
    queryKey: ANALYTICS_QK,
    queryFn: fetchAnalyticsSDK,
    staleTime: 60_000,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMember>[1] }) =>
      updateMember(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEMBERS_QK }),
    onError: () => toast.error('Failed to update member'),
  })

  const removeMut = useMutation({
    mutationFn: (m: AppMember) => removeMember(m.id, m.userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: MEMBERS_QK }); toast.success('Member removed') },
    onError: () => toast.error('Failed to remove member'),
  })

  const createMut = useMutation({
    mutationFn: createMember,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: MEMBERS_QK }); toast.success('Member added') },
    onError: (e: any) => toast.error(e?.message?.includes('UNIQUE') ? 'Email already exists' : 'Failed to add member'),
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const email = addEmail.trim().toLowerCase()
    if (!email) return
    await createMut.mutateAsync({ email, appRole: addRole, capabilities: addCap })
    setAddEmail('')
    setAddRole('member')
    setAddCap('both')
    addEmailRef.current?.focus()
  }

  async function handleBulkImport() {
    const emails = bulkText
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))
    if (emails.length === 0) { toast.error('No valid emails found'); return }

    let added = 0, skipped = 0
    for (const email of emails) {
      try {
        await createMember({ email, appRole: 'member', capabilities: 'both' })
        added++
      } catch {
        skipped++ // already exists
      }
    }
    queryClient.invalidateQueries({ queryKey: MEMBERS_QK })
    toast.success(`Added ${added}${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`)
    setBulkText('')
    setBulkOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Top row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h1 className="font-serif text-base font-semibold text-foreground">Admin Console</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Upload className="h-3.5 w-3.5" />Bulk import
              </button>
            </div>
          </div>

          {/* Tab row */}
          <div className="flex items-center gap-0">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                tab === 'overview'
                  ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:bg-primary after:content-[\'\']'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setTab('members')}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
                tab === 'members'
                  ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:bg-primary after:content-[\'\']'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Members
              {members.length > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  tab === 'members' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}>
                  {members.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('sentbox')}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
                tab === 'sentbox'
                  ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:bg-primary after:content-[\'\']'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Inbox className="h-3.5 w-3.5" />
              Sent Mail
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Platform Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">Live stats pulled directly from the database.</p>
            </div>

            {analyticsLoading ? (
              <AnalyticsSkeleton />
            ) : analyticsError || !analytics ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                Could not load analytics. Please refresh the page.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Active members"
                  value={analytics.activeMembers}
                  sub="tap to see list"
                  iconClass="text-emerald-600"
                  onClick={() => setDrillKey('activeMembers')}
                />
                <StatCard
                  icon={<UserPlus className="h-4 w-4" />}
                  label="Invited (pending)"
                  value={analytics.invitedMembers}
                  sub="tap to see list"
                  iconClass="text-amber-500"
                  onClick={() => setDrillKey('invitedMembers')}
                />
                <StatCard
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Total sessions"
                  value={analytics.totalSessions}
                  sub="all availability entries"
                  iconClass="text-primary"
                />
                <StatCard
                  icon={<Hand className="h-4 w-4" />}
                  label="Sitter sessions"
                  value={analytics.sitterSessions}
                  sub="tap to see list"
                  iconClass="text-violet-500"
                  onClick={() => setDrillKey('sitters')}
                />
                <StatCard
                  icon={<Wind className="h-4 w-4" />}
                  label="Breather sessions"
                  value={analytics.breatherSessions}
                  sub="tap to see list"
                  iconClass="text-sky-500"
                  onClick={() => setDrillKey('breathers')}
                />
                <StatCard
                  icon={<UserCheck className="h-4 w-4" />}
                  label="Sessions with attendees"
                  value={`${analytics.sessionsWithAttendees} / ${analytics.sitterSessions}`}
                  sub="tap to see list"
                  iconClass="text-teal-600"
                  onClick={() => setDrillKey('sitterWithAttendees')}
                />
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Total joins"
                  value={analytics.totalAttendees}
                  sub="session_attendees records"
                  iconClass="text-orange-500"
                />
                <StatCard
                  icon={<BarChart2 className="h-4 w-4" />}
                  label="Avg attendees / sitter session"
                  value={analytics.avgAttendeesPerSitter}
                  sub="total joins ÷ sitter sessions"
                  iconClass="text-rose-500"
                />
                <StatCard
                  icon={<Bell className="h-4 w-4" />}
                  label="Push subscribers"
                  value={analytics.pushSubscribers}
                  sub="push_subscriptions"
                  iconClass="text-indigo-500"
                />
                <StatCard
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Unmatched opportunities"
                  value={analytics.opportunities}
                  sub="tap to see list"
                  iconClass="text-amber-500"
                  onClick={() => setDrillKey('opportunities')}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Members tab ── */}
        {tab === 'members' && (
          <div>
            {/* Bulk import panel */}
            {bulkOpen && (
              <div className="mb-6 rounded-xl border border-border bg-muted/20 p-5">
                <h2 className="mb-1 text-sm font-semibold text-foreground">Bulk import members</h2>
                <p className="mb-3 text-xs text-muted-foreground">Paste email addresses separated by commas or new lines. All will be added as <strong>Member</strong> with <strong>Sitter &amp; Breather</strong> capability.</p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"alice@example.com, bob@example.com\ncarol@example.com"}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-ring"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setBulkOpen(false)}
                    className="rounded-md border border-border px-4 py-1.5 text-sm text-foreground transition hover:bg-muted">
                    Cancel
                  </button>
                  <button type="button" onClick={handleBulkImport}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                    <Upload className="h-3.5 w-3.5" />Import
                  </button>
                </div>
              </div>
            )}

            {/* Pending access requests */}
            {(() => {
              const pendingRequests = members.filter((m) => m.status === 'requested')
              if (pendingRequests.length === 0) return null
              return (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-amber-200 dark:border-amber-900/40">
                    <UserPlus className="h-4 w-4 text-amber-600" />
                    <h2 className="text-sm font-semibold text-foreground">Pending Access Requests</h2>
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      {pendingRequests.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-amber-200/70 dark:border-amber-900/30 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          <th className="py-2.5 pl-5 pr-3">Email</th>
                          <th className="px-3 py-2.5">Requested</th>
                          <th className="py-2.5 pl-3 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRequests.map((m) => (
                          <PendingRequestRow
                            key={m.id}
                            member={m}
                            onDecline={() => removeMut.mutate(m, { onSuccess: () => toast('Request declined.') })}
                            declineLoading={removeMut.isPending}
                            onAccepted={() => queryClient.invalidateQueries({ queryKey: MEMBERS_QK })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* Add member form */}
            <div className="mb-6 rounded-xl border border-border bg-muted/10 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-primary" />Add member
              </h2>
              <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                  <input
                    ref={addEmailRef}
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="member@example.com"
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as AppRole)}
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none transition focus:ring-1 focus:ring-ring"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Capability</label>
                  <select
                    value={addCap}
                    onChange={(e) => setAddCap(e.target.value as Capabilities)}
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none transition focus:ring-1 focus:ring-ring"
                  >
                    <option value="both">Sitter &amp; Breather</option>
                    <option value="sitter">Sitter only</option>
                    <option value="breather">Breather only</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {createMut.isPending ? 'Adding…' : 'Add'}
                </button>
              </form>
            </div>

            {/* Members table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="h-4 w-4 text-primary" />Members
                  {members.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">{members.length}</span>
                  )}
                </h2>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No members yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 pl-4 pr-3">Email / Last seen</th>
                        <th className="px-3 py-2.5">Role</th>
                        <th className="px-3 py-2.5">Capability</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="py-2.5 pl-3 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <MemberRow
                          key={m.id}
                          member={m}
                          isCurrentUser={m.email === currentUserEmail.toLowerCase()}
                          onRoleChange={(role) => updateMut.mutate({ id: m.id, data: { appRole: role } })}
                          onCapChange={(cap) => updateMut.mutate({ id: m.id, data: { capabilities: cap } })}
                          onBlock={() => updateMut.mutate({ id: m.id, data: { status: 'blocked' } })}
                          onUnblock={() => updateMut.mutate({ id: m.id, data: { status: 'active' } })}
                          onRemove={() => setConfirmRemove(m)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 rounded-lg border border-border/60 bg-muted/10 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1.5">How access works</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Requested</strong> — user submitted a request; awaiting admin approval.</li>
                <li><strong>Invited</strong> — email is pre-registered; user hasn't signed in yet.</li>
                <li><strong>Active</strong> — admin approved access (by pre-adding or accepting a request). Member may or may not have signed in yet.</li>
                <li><strong>Blocked</strong> — user is prevented from accessing the app.</li>
                <li>Users must sign in with the exact email address listed here (email or SSO).</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Sent Mail tab ── */}
        {tab === 'sentbox' && (
          <SentboxTab emailLog={emailLog} isLoading={emailLogLoading} onRefresh={() => refetchEmailLog()} />
        )}

      </div>

      {/* Remove confirm dialog */}
      {confirmRemove && (
        <RemoveConfirmDialog
          member={confirmRemove}
          onConfirm={() => { removeMut.mutate(confirmRemove); setConfirmRemove(null) }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}

      {/* ── Drill-down modals ── */}
      {drillKey && analytics && (() => {
        const configs: Record<NonNullable<DrillKey>, { title: string; items: DrillItem[] }> = {
          activeMembers: { title: 'Active Members', items: analytics.activeMemberList },
          invitedMembers: { title: 'Invited / Pending Members', items: analytics.invitedMemberList },
          sitters: { title: 'Sitter Sessions', items: analytics.sitterList },
          breathers: { title: 'Breather Sessions', items: analytics.breatherList },
          sitterWithAttendees: { title: 'Sitter Sessions with Attendees', items: analytics.sitterWithAttendeesList },
          opportunities: { title: 'Unmatched Opportunities', items: analytics.opportunityList },
        }
        const cfg = configs[drillKey]
        return <DrillModal title={cfg.title} items={cfg.items} onClose={() => setDrillKey(null)} />
      })()}
    </div>
  )
}
