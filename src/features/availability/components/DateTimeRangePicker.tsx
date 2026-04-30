import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIMEZONE_GROUPS, getTimezoneAbbr } from '@/features/availability/timezone'

interface DateTimeRangePickerProps {
  date: string
  timezone: string
  startTime: string
  endTime: string
  onChange: (field: 'date' | 'timezone' | 'startTime' | 'endTime', value: string) => void
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2)
  const minutes = index % 2 === 0 ? '00' : '30'
  const value = `${String(hours).padStart(2, '0')}:${minutes}`
  const hour12 = hours % 12 || 12
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return { value, label: `${hour12}:${minutes} ${suffix}` }
})

function getCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'
const selectCls =
  'w-full appearance-none bg-transparent px-3 py-2 text-sm text-foreground outline-none cursor-pointer'

export function DateTimeRangePicker({
  date,
  timezone,
  startTime,
  endTime,
  onChange,
}: DateTimeRangePickerProps) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    date ? startOfMonth(new Date(`${date}T00:00:00`)) : startOfMonth(new Date())
  )

  // Reset the visible month whenever the date prop changes (e.g. form re-opened
  // with a new prefill date). Without this the calendar stays on the last-used
  // month even though a different prefill date was passed in.
  useEffect(() => {
    setVisibleMonth(
      date ? startOfMonth(new Date(`${date}T00:00:00`)) : startOfMonth(new Date())
    )
  }, [date])

  const selectedDate = date ? new Date(`${date}T00:00:00`) : null
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth])
  const tzAbbr = getTimezoneAbbr(timezone)

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      {/* ── Date picker ── */}
      <div className="border-b border-border/60 px-4 pt-3 pb-3">
        <div className={cn(sectionLabel, 'mb-2.5 flex items-center gap-1.5')}>
          <CalendarDays className="h-3.5 w-3.5" />
          Date
        </div>

        {/* Month navigation */}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setVisibleMonth((c) => subMonths(c, 1))}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {format(visibleMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setVisibleMonth((c) => addMonths(c, 1))}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const value = format(day, 'yyyy-MM-dd')
            const selected = selectedDate ? isSameDay(day, selectedDate) : false
            const inMonth = isSameMonth(day, visibleMonth)
            const current = isToday(day)

            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange('date', value)}
                className={cn(
                  'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition',
                  selected && 'bg-primary text-primary-foreground font-semibold shadow-sm',
                  !selected && current && 'font-semibold text-primary ring-1 ring-primary/30',
                  !selected && inMonth && 'text-foreground hover:bg-secondary',
                  !selected && !inMonth && 'text-muted-foreground/40'
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Timezone ── */}
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className={cn(sectionLabel, 'mb-1.5 flex items-center gap-1.5')}>
          <Globe className="h-3.5 w-3.5" />
          Timezone
        </div>
        <div className="relative">
          <select
            value={timezone}
            onChange={(e) => onChange('timezone', e.target.value)}
            className={cn(selectCls, 'pr-16 -ml-3')}
          >
            {TIMEZONE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.zones.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
            {tzAbbr}
          </span>
        </div>
      </div>

      {/* ── Start time ── */}
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className={cn(sectionLabel, 'mb-1.5 flex items-center gap-1.5')}>
          <Clock className="h-3.5 w-3.5" />
          Start time
        </div>
        <select
          required
          value={startTime}
          onChange={(e) => onChange('startTime', e.target.value)}
          className={cn(selectCls, '-ml-3')}
        >
          <option value="">Select start time</option>
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── End time ── */}
      <div className="px-4 py-2.5">
        <div className={cn(sectionLabel, 'mb-1.5 flex items-center gap-1.5')}>
          <Clock className="h-3.5 w-3.5" />
          End time
        </div>
        <select
          required
          value={endTime}
          onChange={(e) => onChange('endTime', e.target.value)}
          className={cn(selectCls, '-ml-3')}
        >
          <option value="">Select end time</option>
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
