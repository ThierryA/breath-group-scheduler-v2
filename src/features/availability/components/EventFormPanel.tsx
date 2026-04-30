import { useEffect, useState } from 'react'
import { X, Trash2, User, Repeat, Hand, Wind } from 'lucide-react'
import toast from 'react-hot-toast'
import { addWeeks, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { detectTimezone } from '@/features/availability/timezone'
import { DateTimeRangePicker } from './DateTimeRangePicker'
import type { AvailabilityEntry, AvailabilityInput, RecurrenceRule } from '@/features/availability/api'

interface EventFormPanelProps {
  open: boolean
  entry: AvailabilityEntry | null
  prefillDate?: string
  prefillRole?: 'breather' | 'sitter'
  prefillStartTime?: string
  prefillEndTime?: string
  user: { id: string; email: string; displayName?: string | null }
  isSaving: boolean
  onClose: () => void
  onSubmit: (values: AvailabilityInput, occurrences: AvailabilityInput[]) => Promise<void>
  onDelete?: (id: string) => void
}

const emptyValues = (
  date = '',
  role?: 'breather' | 'sitter',
  startTime = '',
  endTime = '',
): AvailabilityInput => ({
  name: '',
  email: '',
  role: role || 'breather',
  date,
  startTime,
  endTime,
  timezone: detectTimezone(),
  notes: '',
  maxAttendees: null,
  recurrenceRule: null,
  recurringGroupId: null,
})

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

function generateOccurrenceDates(startDate: string, rule: RecurrenceRule, count: number): string[] {
  const base = new Date(`${startDate}T00:00:00`)
  const dates: string[] = []
  for (let i = 1; i < count; i++) {
    let next: Date
    if (rule === 'weekly') next = addWeeks(base, i)
    else if (rule === 'biweekly') next = addWeeks(base, i * 2)
    else next = new Date(base.getFullYear(), base.getMonth() + i, base.getDate())
    dates.push(format(next, 'yyyy-MM-dd'))
  }
  return dates
}

export function EventFormPanel({
  open,
  entry,
  prefillDate,
  prefillRole,
  prefillStartTime,
  prefillEndTime,
  user,
  isSaving,
  onClose,
  onSubmit,
  onDelete,
}: EventFormPanelProps) {
  const [values, setValues] = useState<AvailabilityInput>(emptyValues())
  const [isRecurring, setIsRecurring] = useState(false)
  const [occurrenceCount, setOccurrenceCount] = useState(4)

  useEffect(() => {
    if (entry) {
      setValues({
        name: entry.name,
        email: entry.email ?? '',
        role: entry.role,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        timezone: entry.timezone || detectTimezone(),
        notes: entry.notes ?? '',
        maxAttendees: entry.maxAttendees ?? null,
        recurrenceRule: entry.recurrenceRule ?? null,
        recurringGroupId: entry.recurringGroupId ?? null,
      })
      setIsRecurring(!!entry.recurringGroupId)
    } else {
      const base = emptyValues(prefillDate, prefillRole, prefillStartTime, prefillEndTime)
      base.name = user.displayName || user.email.split('@')[0]
      base.email = user.email
      setValues(base)
      setIsRecurring(false)
      setOccurrenceCount(4)
    }
  }, [open, entry, prefillDate, prefillRole, prefillStartTime, prefillEndTime, user])

  const update = (field: keyof AvailabilityInput, value: string | number | null) =>
    setValues((v) => ({ ...v, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.date) {
      toast.error('Please select a date on the calendar before saving.')
      return
    }
    let occurrences: AvailabilityInput[] = []
    let primaryValues = { ...values }

    if (!entry && isRecurring && values.date) {
      // Default to 'weekly' if user never changed the dropdown
      const rule: RecurrenceRule = (values.recurrenceRule as RecurrenceRule) || 'weekly'
      const groupId = crypto.randomUUID()
      const futureDates = generateOccurrenceDates(values.date, rule, occurrenceCount)
      primaryValues = { ...values, recurringGroupId: groupId, recurrenceRule: rule }
      occurrences = futureDates.map((d) => ({
        ...values,
        date: d,
        recurringGroupId: groupId,
        recurrenceRule: rule,
      }))
    }

    await onSubmit(primaryValues, occurrences)
  }

  if (!open) return null

  const isSitter = values.role === 'sitter'
  const isEdit = !!entry

  const headerTitle = isEdit
    ? 'Edit session'
    : isSitter
      ? 'Create sitter session'
      : 'Create breather availability'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20 animate-fade-overlay-in" onClick={onClose} />

      <div className={cn(
        'relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl animate-slide-in-right',
        'sm:max-w-[26rem]'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            {!isEdit && (
              isSitter
                ? <Hand className="h-4 w-4 text-accent" />
                : <Wind className="h-4 w-4 text-primary" />
            )}
            <h2 className="font-heading text-sm font-semibold text-foreground">{headerTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <form id="event-form-panel" onSubmit={handleSubmit} className="flex flex-col gap-3.5 p-5">
            {/* Identity line — always shown, read-only */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Posting as {user.displayName || user.email}</span>
            </div>

            {/* When (Date + Timezone + Start/End) */}
            <div className="grid gap-1">
              <span className="text-xs font-medium text-foreground">When</span>
              <DateTimeRangePicker
                date={values.date}
                timezone={values.timezone}
                startTime={values.startTime}
                endTime={values.endTime}
                onChange={(field, value) => update(field as keyof AvailabilityInput, value)}
              />
            </div>

            {/* Max attendees — sitter only */}
            {isSitter && (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-foreground">Max breathers</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={values.maxAttendees ?? ''}
                  onChange={(e) => update('maxAttendees', e.target.value ? parseInt(e.target.value, 10) : null)}
                  className={inputCls}
                  placeholder="Unlimited"
                />
                <span className="text-[11px] text-muted-foreground">Leave blank for no limit</span>
              </label>
            )}

            {/* Notes */}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-foreground">Notes</span>
              <textarea
                value={values.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Optional details or preferences"
              />
            </label>

            {/* Recurring — new events only */}
            {!isEdit && (
              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    Recurring event
                  </span>
                </label>
                {isRecurring && (
                  <div className="mt-3 grid gap-2.5">
                    <label className="grid gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Repeat</span>
                      <select
                        value={values.recurrenceRule ?? 'weekly'}
                        onChange={(e) => update('recurrenceRule', e.target.value)}
                        className={inputCls}
                      >
                        <option value="weekly">Every week</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Every month</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Number of sessions</span>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={occurrenceCount}
                        onChange={(e) => setOccurrenceCount(parseInt(e.target.value, 10) || 2)}
                        className={inputCls}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {isEdit && entry?.recurringGroupId && (
              <div className="flex items-center gap-1.5 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Repeat className="h-3.5 w-3.5" />This is a recurring session
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 border-t border-border px-5 py-2.5">
          {entry && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="mr-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />Delete
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted">
            Cancel
          </button>
          <button
            type="submit"
            form="event-form-panel"
            disabled={isSaving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}