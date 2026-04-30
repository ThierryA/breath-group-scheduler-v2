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

/** Convert entry date to the display timezone */
export function entryDisplayDate(entry: AvailabilityEntry, displayTz: string): string {
  const tz = entry.timezone || 'UTC'
  return convertTime(entry.date, entry.startTime, tz, displayTz).date
}

/** Get the display start/end times for an entry */
export function entryDisplayTimes(entry: AvailabilityEntry, displayTz: string) {
  const tz = entry.timezone || 'UTC'
  const start = convertTime(entry.date, entry.startTime, tz, displayTz)
  const end = convertTime(entry.date, entry.endTime, tz, displayTz)
  return { startTime: start.time, endTime: end.time }
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