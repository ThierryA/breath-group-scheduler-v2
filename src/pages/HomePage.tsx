import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { detectTimezone } from '@/features/availability/timezone'
import type { AppMember } from '@/features/members/api'
import {
  listAvailabilityEntries,
  createAvailabilityEntry,
  updateAvailabilityEntry,
  deleteAvailabilityEntry,
  deleteRecurringGroup,
  updateRecurringGroup,
  type AvailabilityEntry,
  type AvailabilityInput,
} from '@/features/availability/api'
import { listAllAttendees } from '@/features/availability/attendees-api'
import {
  entriesOverlapInTimezone,
  entryDisplayDate,
  entryDisplayRange,
  entryDisplayTimes,
  todayInTimezone,
} from '@/features/availability/utils/calendarHelpers'
import { CalendarToolbar, type MineFilter, type RoleFilter } from '@/features/availability/components/CalendarToolbar'
import { MiniCalendar } from '@/features/availability/components/MiniCalendar'
import { TimelineSchedule } from '@/features/availability/components/TimelineSchedule'
import { EventFormPanel } from '@/features/availability/components/EventFormPanel'
import { DetailPanel } from '@/features/availability/components/DetailPanel'
import { RecurringConfirmDialog } from '@/features/availability/components/RecurringConfirmDialog'
import { MyMatchesModal, type MatchSitter, type MatchBreather } from '@/features/availability/components/MyMatchesModal'

/** Turn "name.surname", "name_surname", or "namesurname" into "Name Surname" */
function beautifyName(raw: string): string {
  if (!raw) return raw
  return raw
    .trim()
    .replace(/[._-]+/g, ' ')          // dots, underscores, hyphens → space
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → spaced
    .replace(/\s+/g, ' ')             // collapse multiple spaces
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

const QK = ['availabilityEntries']
const ATTENDEES_QK = ['allAttendees']

interface HomePageProps {
  user: { id: string; email: string; displayName?: string | null }
  member: AppMember
  isAdmin?: boolean
  onNavigateAdmin?: () => void
  onNavigateDocs?: () => void
  onNavigateInstall?: () => void
  onNavigateSettings?: () => void
  login: () => void
  logout: () => void
}

export function HomePage({ user, member, isAdmin, onNavigateAdmin, onNavigateDocs, onNavigateInstall, onNavigateSettings, login, logout }: HomePageProps) {
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [displayTz, setDisplayTz] = useState(detectTimezone)
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<AvailabilityEntry | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | undefined>()
  const [prefillRole, setPrefillRole] = useState<'breather' | 'sitter' | undefined>()
  const [prefillStartTime, setPrefillStartTime] = useState<string | undefined>()
  const [prefillEndTime, setPrefillEndTime] = useState<string | undefined>()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Filters
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [mineFilter, setMineFilter] = useState<MineFilter>('all')

  // My Matches modal
  const [matchesOpen, setMatchesOpen] = useState(false)

  // Detail panel
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailEntry, setDetailEntry] = useState<AvailabilityEntry | null>(null)

  // Open entry from URL param (?entry=<id>)
  const linkedEntryHandled = useRef(false)

  // Recurring confirm dialog
  const [recurringDialog, setRecurringDialog] = useState<{
    open: boolean
    action: 'update' | 'delete'
    entry: AvailabilityEntry | null
    pendingValues?: AvailabilityInput
  }>({ open: false, action: 'update', entry: null })

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: QK,
    queryFn: listAvailabilityEntries,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const { data: allAttendees = [] } = useQuery({
    queryKey: ATTENDEES_QK,
    queryFn: listAllAttendees,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  // Open entry from ?entry=<id> URL param on first load
  useEffect(() => {
    if (linkedEntryHandled.current || entries.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const entryId = params.get('entry')
    if (!entryId) return
    const found = entries.find((e) => e.id === entryId)
    if (found) {
      linkedEntryHandled.current = true
      setDetailEntry(found)
      setDetailOpen(true)
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [entries])

  const attendeeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of allAttendees) counts[a.entryId] = (counts[a.entryId] || 0) + 1
    return counts
  }, [allAttendees])

  // --- My Matches computation ---
  const myMatches = useMemo(() => {
    if (!user) return { sitterMatches: [] as MatchSitter[], breatherMatches: [] as MatchBreather[], total: 0 }
    const today = todayInTimezone(displayTz)
    const myEmail = user.email.toLowerCase().trim()

    // Per-sitter attendee emails & counts
    const attendeeEmailsBySitter: Record<string, Set<string>> = {}
    const attendeeCountBySitter: Record<string, number> = {}
    for (const a of allAttendees) {
      const eid = a.entryId
      attendeeCountBySitter[eid] = (attendeeCountBySitter[eid] ?? 0) + 1
      if (!attendeeEmailsBySitter[eid]) attendeeEmailsBySitter[eid] = new Set()
      if (a.email) attendeeEmailsBySitter[eid].add(a.email.toLowerCase().trim())
    }

    // Use the viewer's calendar date so sessions near midnight are handled consistently.
    const myBreathers = entries.filter(
      (e) => e.role === 'breather' && (e.email ?? '').toLowerCase().trim() === myEmail && entryDisplayDate(e, displayTz) >= today
    )
    const mySitters = entries.filter(
      (e) => e.role === 'sitter' && (e.userId === user.id || (e.email ?? '').toLowerCase().trim() === myEmail) && entryDisplayDate(e, displayTz) >= today
    )

    const otherSitters = entries.filter((e) => {
      if (e.role !== 'sitter' || entryDisplayDate(e, displayTz) < today) return false
      if (e.userId === user.id || (e.email ?? '').toLowerCase().trim() === myEmail) return false
      const max = e.maxAttendees != null ? Number(e.maxAttendees) : null
      return max === null || max <= 0 || (attendeeCountBySitter[e.id] ?? 0) < max
    })

    const otherBreathers = entries.filter((e) =>
      e.role === 'breather' && entryDisplayDate(e, displayTz) >= today &&
      (e.email ?? '').toLowerCase().trim() !== myEmail
    )

    const sitterMatches: MatchSitter[] = []
    for (const myB of myBreathers) {
      for (const sitter of otherSitters) {
        if (!entriesOverlapInTimezone(myB, sitter, displayTz)) continue
        const sitterRange = entryDisplayRange(sitter, displayTz)
        const alreadyJoined = attendeeEmailsBySitter[sitter.id]?.has(myEmail) ?? false
        sitterMatches.push({
          sitterId: sitter.id,
          sitterName: sitter.name,
          sitterDate: sitterRange.startDate,
          sitterStart: sitterRange.startTime,
          sitterEnd: sitterRange.endTime,
          sitterMax: sitter.maxAttendees != null ? Number(sitter.maxAttendees) : null,
          sitterCount: attendeeCountBySitter[sitter.id] ?? 0,
          alreadyJoined,
          breatherId: myB.id,
          breatherName: myB.name,
        })
      }
    }

    const breatherMatches: MatchBreather[] = []
    for (const mySitter of mySitters) {
      for (const breather of otherBreathers) {
        if (!entriesOverlapInTimezone(mySitter, breather, displayTz)) continue
        const breatherRange = entryDisplayRange(breather, displayTz)
        const breatherEmail = (breather.email ?? '').toLowerCase().trim()
        const alreadyHasSitter = entries.some((sitter) =>
          sitter.role === 'sitter' &&
          entriesOverlapInTimezone(sitter, breather, displayTz) &&
          (attendeeEmailsBySitter[sitter.id]?.has(breatherEmail) ?? false)
        )
        if (alreadyHasSitter) continue
        breatherMatches.push({
          breatherId: breather.id,
          breatherName: breather.name,
          breatherDate: breatherRange.startDate,
          breatherStart: breatherRange.startTime,
          breatherEnd: breatherRange.endTime,
          sitterId: mySitter.id,
          sitterName: mySitter.name,
        })
      }
    }

    return { sitterMatches, breatherMatches, total: sitterMatches.length + breatherMatches.length }
  }, [user, entries, allAttendees, displayTz])

  const attendingEntryIds = useMemo(() => {
    if (!user) return new Set<string>()
    return new Set(
      allAttendees.filter((a) => a.email.toLowerCase() === user.email.toLowerCase()).map((a) => a.entryId)
    )
  }, [allAttendees, user])

  const filteredEntries = useMemo(() => {
    let result = entries
    if (roleFilter !== 'all') {
      result = result.filter((e) => e.role === roleFilter)
    }
    if (mineFilter === 'created' && user) {
      result = result.filter((e) => e.userId === user.id)
    } else if (mineFilter === 'attending' && user) {
      result = result.filter((e) => attendingEntryIds.has(e.id))
    } else if (mineFilter === 'daytime') {
      result = result.filter((e) => {
        const { startTime } = entryDisplayTimes(e, displayTz)
        const hour = parseInt(startTime.split(':')[0], 10)
        return hour >= 6 && hour < 22
      })
    }
    return result
  }, [entries, roleFilter, mineFilter, user, attendingEntryIds, displayTz])

  const datesWithEntries = useMemo(() => {
    return new Set(filteredEntries.map((entry) => entryDisplayDate(entry, displayTz)))
  }, [filteredEntries, displayTz])

  const createMut = useMutation({
    mutationFn: createAvailabilityEntry,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: QK })
      const prev = queryClient.getQueryData<AvailabilityEntry[]>(QK) ?? []
      const optimistic: AvailabilityEntry = {
        id: `optimistic_${Date.now()}`,
        name: input.name,
        email: input.email,
        role: input.role,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: input.userId ?? null,
        maxAttendees: input.maxAttendees ?? null,
        recurringGroupId: input.recurringGroupId ?? null,
        recurrenceRule: input.recurrenceRule ?? null,
      }
      queryClient.setQueryData<AvailabilityEntry[]>(QK, [...prev, optimistic].sort((a, b) =>
        `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
      ))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QK, ctx.prev)
      toast.error('Could not save')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QK }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, vals }: { id: string; vals: AvailabilityInput }) => updateAvailabilityEntry(id, vals),
    onMutate: async ({ id, vals }) => {
      await queryClient.cancelQueries({ queryKey: QK })
      const prev = queryClient.getQueryData<AvailabilityEntry[]>(QK) ?? []
      queryClient.setQueryData<AvailabilityEntry[]>(QK, prev.map((e) =>
        e.id === id ? { ...e, ...vals, updatedAt: new Date().toISOString() } : e
      ))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QK, ctx.prev)
      toast.error('Could not update')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QK }),
  })

  const isSaving = createMut.isPending || updateMut.isPending

  /* ── Panel controls ── */

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditEntry(null)
    setPrefillDate(undefined)
    setPrefillRole(undefined)
    setPrefillStartTime(undefined)
    setPrefillEndTime(undefined)
  }, [])

  const closeDetail = useCallback(() => { setDetailOpen(false); setDetailEntry(null) }, [])

  const openAddSitter = useCallback((date?: string) => {
    if (!user) { login(); return }
    setEditEntry(null)
    setPrefillDate(date || selectedDate)
    setPrefillRole('sitter')
    setPrefillStartTime(undefined)
    setPrefillEndTime(undefined)
    setFormOpen(true)
  }, [selectedDate, user, login])

  const openAddBreather = useCallback((date?: string) => {
    if (!user) { login(); return }
    setEditEntry(null)
    setPrefillDate(date || selectedDate)
    setPrefillRole('breather')
    setPrefillStartTime(undefined)
    setPrefillEndTime(undefined)
    setFormOpen(true)
  }, [selectedDate, user, login])

  const openEdit = useCallback((entry: AvailabilityEntry) => {
    closeDetail()
    setEditEntry(entry)
    setPrefillDate(undefined)
    setPrefillRole(undefined)
    setFormOpen(true)
  }, [closeDetail])

  const openView = useCallback((entry: AvailabilityEntry) => { setDetailEntry(entry); setDetailOpen(true) }, [])

  const handleSitSession = useCallback((entry: AvailabilityEntry) => {
    if (!user) { login(); return }
    setEditEntry(null)
    setPrefillDate(entry.date)
    setPrefillRole('sitter')
    setPrefillStartTime(entry.startTime)
    setPrefillEndTime(entry.endTime)
    setFormOpen(true)
  }, [user, login])

  const invalidateAttendees = useCallback(() => { queryClient.invalidateQueries({ queryKey: ATTENDEES_QK }) }, [queryClient])

  const canEdit = useCallback((entry: AvailabilityEntry) => {
    if (!entry.userId) return false
    if (!user) return false
    return entry.userId === user.id
  }, [user])

  /* ── Submit handler ── */

  async function handleSubmit(values: AvailabilityInput, occurrences: AvailabilityInput[]) {
    if (!user) return
    if (values.endTime <= values.startTime) { toast.error('End time must be after start time'); return }

    const submitValues: AvailabilityInput = {
      ...values,
      name: beautifyName(values.name || user.displayName || user.email.split('@')[0]),
      email: (values.email || user.email).trim(),
      userId: user.id,
    }

    if (editEntry) {
      if (editEntry.recurringGroupId) {
        setRecurringDialog({ open: true, action: 'update', entry: editEntry, pendingValues: submitValues })
        return
      }
      await updateMut.mutateAsync({ id: editEntry.id, vals: submitValues })
      toast.success('Entry updated')
      closeForm()
      return
    }

    await createMut.mutateAsync(submitValues)
    if (occurrences.length > 0) {
      await Promise.all(occurrences.map((occ) =>
        createMut.mutateAsync({ ...occ, name: submitValues.name, email: submitValues.email, userId: user.id })
      ))
    }
    toast.success(occurrences.length > 0 ? `Created ${occurrences.length + 1} sessions` : 'Availability added')
    closeForm()
  }

  /* ── Delete handler ── */

  async function handleDelete(id: string) {
    const entry = entries.find((e) => e.id === id)
    if (entry?.recurringGroupId) { setRecurringDialog({ open: true, action: 'delete', entry }); return }
    // Optimistic delete
    const prev = queryClient.getQueryData<AvailabilityEntry[]>(QK) ?? []
    queryClient.setQueryData<AvailabilityEntry[]>(QK, prev.filter((e) => e.id !== id))
    closeForm()
    try {
      await deleteAvailabilityEntry(id)
      toast.success('Entry deleted')
    } catch {
      queryClient.setQueryData(QK, prev)
      toast.error('Could not delete')
    } finally {
      queryClient.invalidateQueries({ queryKey: QK })
    }
  }

  /* ── Recurring dialog handlers ── */

  async function handleRecurringThisOnly() {
    const { action, entry, pendingValues } = recurringDialog
    setRecurringDialog((d) => ({ ...d, open: false }))
    if (!entry) return
    try {
      if (action === 'delete') { await deleteAvailabilityEntry(entry.id); toast.success('Session deleted') }
      else if (action === 'update' && pendingValues) { await updateMut.mutateAsync({ id: entry.id, vals: pendingValues }); toast.success('Session updated') }
      queryClient.invalidateQueries({ queryKey: QK })
      closeForm()
    } catch { toast.error('Could not complete action') }
  }

  async function handleRecurringAllFuture() {
    const { action, entry, pendingValues } = recurringDialog
    setRecurringDialog((d) => ({ ...d, open: false }))
    if (!entry?.recurringGroupId) return
    try {
      if (action === 'delete') { await deleteRecurringGroup(entry.recurringGroupId, entry.date); toast.success('Future sessions deleted') }
      else if (action === 'update' && pendingValues) { await updateRecurringGroup(entry.recurringGroupId, pendingValues, entry.date); toast.success('Future sessions updated') }
      queryClient.invalidateQueries({ queryKey: QK })
      closeForm()
    } catch { toast.error('Could not complete action') }
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date)
    setCurrentMonth(startOfMonth(new Date(`${date}T00:00:00`)))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CalendarToolbar
        displayTimezone={displayTz}
        onTimezoneChange={setDisplayTz}
        onAddSitter={() => openAddSitter()}
        onAddBreather={() => openAddBreather()}
        user={user}
        onLogin={login}
        onLogout={logout}
        isAdmin={isAdmin}
        capabilities={member?.capabilities ?? null}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateDocs={onNavigateDocs}
        onNavigateInstall={onNavigateInstall}
        onNavigateSettings={onNavigateSettings}
        userId={user?.id}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        mineFilter={mineFilter}
        onMineFilterChange={setMineFilter}
        onMyMatchesClick={user ? () => setMatchesOpen(true) : undefined}
        myMatchesCount={user ? myMatches.total : undefined}
      />

      {/* Spacer for the single fixed toolbar (navbar row + filter row) */}
      <div className="h-[93px] shrink-0" aria-hidden="true" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Mobile calendar */}
        <div className="mb-6 lg:hidden">
          <MiniCalendar
            month={currentMonth}
            selectedDate={selectedDate}
            datesWithEntries={datesWithEntries}
            onSelectDate={handleSelectDate}
            onMonthChange={setCurrentMonth}
          />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-10">
          {/* Timeline (left column) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <TimelineSchedule
              isLoading={entriesLoading}
              entries={filteredEntries}
              allEntries={entries}
              allAttendees={allAttendees}
              displayTimezone={displayTz}
              attendeeCounts={attendeeCounts}
              selectedDate={selectedDate}
              roleFilter={roleFilter}
              user={user}
              canEdit={canEdit}
              onViewEntry={openView}
              onEditEntry={openEdit}
              onSitSession={handleSitSession}
              onJoinSuccess={invalidateAttendees}
            />
          </div>

          {/* Mini calendar sidebar */}
          <aside className="hidden lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:block xl:col-start-9">
            <div className="sticky top-24 space-y-6">
              <MiniCalendar
                month={currentMonth}
                selectedDate={selectedDate}
                datesWithEntries={datesWithEntries}
                onSelectDate={handleSelectDate}
                onMonthChange={setCurrentMonth}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Detail panel */}
      <DetailPanel
        open={detailOpen}
        entry={detailEntry}
        allEntries={entries}
        displayTimezone={displayTz}
        user={user}
        isAdmin={isAdmin}
        canEdit={canEdit}
        onClose={closeDetail}
        onEdit={openEdit}
        onAttendeesChange={invalidateAttendees}
      />

      {/* Form panel — only for signed-in users */}
      {user && (
        <EventFormPanel
          open={formOpen}
          entry={editEntry}
          prefillDate={prefillDate}
          prefillRole={prefillRole}
          prefillStartTime={prefillStartTime}
          prefillEndTime={prefillEndTime}
          user={user}
          isSaving={isSaving}
          onClose={closeForm}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}

      <RecurringConfirmDialog
        open={recurringDialog.open}
        action={recurringDialog.action}
        onThisOnly={handleRecurringThisOnly}
        onAllFuture={handleRecurringAllFuture}
        onCancel={() => setRecurringDialog((d) => ({ ...d, open: false }))}
      />

      {user && (
        <MyMatchesModal
          open={matchesOpen}
          onClose={() => setMatchesOpen(false)}
          sitterMatches={myMatches.sitterMatches}
          breatherMatches={myMatches.breatherMatches}
          user={user}
          onJoinSuccess={() => { invalidateAttendees(); queryClient.invalidateQueries({ queryKey: QK }) }}
          onViewEntry={(id) => {
            const entry = entries.find((e) => e.id === id)
            if (entry) { setMatchesOpen(false); openView(entry) }
          }}
        />
      )}
    </div>
  )
}
