import {
  startOfMonth,
  startOfWeek,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
  addDays,
} from 'date-fns'
import { convertTime } from '@/features/availability/timezone'
import type { AvailabilityEntry } from '@/features/availability/api'

/** Monday-starting month grid (always 6 rows × 7 cols = 42 days) */
export function getMonthDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

/** Get 7 days starting from a given week start */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Convert an entry's complete time range into the viewer's timezone. */
export function entryDisplayRange(entry: AvailabilityEntry, displayTz: string) {
  const tz = entry.timezone || 'UTC'
  const start = convertTime(entry.date, entry.startTime, tz, displayTz)
  const end = convertTime(entry.date, entry.endTime, tz, displayTz)
  return {
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  }
}

/** Convert entry date to the display timezone */
export function entryDisplayDate(entry: AvailabilityEntry, displayTz: string): string {
  return entryDisplayRange(entry, displayTz).startDate
}

/** Get the display start/end times for an entry */
export function entryDisplayTimes(entry: AvailabilityEntry, displayTz: string) {
  const { startTime, endTime } = entryDisplayRange(entry, displayTz)
  return { startTime, endTime }
}

/** Whether two saved entries overlap when viewed in the same timezone. */
export function entriesOverlapInTimezone(
  first: AvailabilityEntry,
  second: AvailabilityEntry,
  displayTz: string
): boolean {
  const a = entryDisplayRange(first, displayTz)
  const b = entryDisplayRange(second, displayTz)
  const aStart = `${a.startDate}T${a.startTime}`
  const aEnd = `${a.endDate}T${a.endTime}`
  const bStart = `${b.startDate}T${b.startTime}`
  const bEnd = `${b.endDate}T${b.endTime}`
  return aStart < bEnd && bStart < aEnd
}

/** Current calendar date in the viewer's timezone, formatted as YYYY-MM-DD. */
export function todayInTimezone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'
  return `${year}-${month}-${day}`
}

/** Group entries by their display date */
export function groupEntriesByDate(
  entries: AvailabilityEntry[],
  displayTz: string
): Record<string, AvailabilityEntry[]> {
  const map: Record<string, AvailabilityEntry[]> = {}
  for (const entry of entries) {
    const dateKey = entryDisplayDate(entry, displayTz)
    if (!map[dateKey]) map[dateKey] = []
    map[dateKey].push(entry)
  }
  return map
}

/** Parse HH:mm to minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Format time as 12h string: 9:00 AM */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export { addMonths, subMonths, format, isSameMonth, isToday, startOfWeek }