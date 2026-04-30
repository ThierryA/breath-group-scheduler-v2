import type { AvailabilityEntry } from '@/features/availability/api'

/**
 * Generate "Add to Calendar" links for all major calendar providers.
 * Dates are built from the entry's stored date + times in UTC-like format
 * so that external calendars interpret them correctly.
 */

function toICSDate(date: string, time: string): string {
  // date = "2026-04-01", time = "14:30" → "20260401T143000"
  return date.replace(/-/g, '') + 'T' + time.replace(/:/g, '') + '00'
}

function toISOCompact(date: string, time: string): string {
  // "2026-04-01", "14:30" → "2026-04-01T14:30:00"
  return `${date}T${time}:00`
}

function encodeTitle(entry: AvailabilityEntry): string {
  const role = entry.role === 'breather' ? 'Breather' : 'Sitter'
  return `Breath Group – ${entry.name} (${role})`
}

function encodeDescription(entry: AvailabilityEntry): string {
  const lines = [`Role: ${entry.role === 'breather' ? 'Breather' : 'Sitter'}`]
  if (entry.notes) lines.push(`Notes: ${entry.notes}`)
  lines.push('', 'Scheduled via Breath Group Scheduler')
  return lines.join('\n')
}

/** Google Calendar "Add Event" URL.
 *  URLSearchParams encodes "/" as "%2F" which breaks Google's `dates` param.
 *  Build the query string manually so the slash stays literal.
 */
export function googleCalendarUrl(entry: AvailabilityEntry): string {
  const title = encodeTitle(entry)
  const details = encodeDescription(entry)
  const start = toICSDate(entry.date, entry.startTime)
  const end = toICSDate(entry.date, entry.endTime)
  const tz = entry.timezone || 'UTC'

  const parts = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(title)}`,
    `dates=${start}/${end}`,          // literal "/" — Google requires this
    `details=${encodeURIComponent(details)}`,
    `ctz=${encodeURIComponent(tz)}`,
  ]
  return `https://calendar.google.com/calendar/render?${parts.join('&')}`
}

/** Outlook.com / Office 365 "Add Event" URL */
export function outlookCalendarUrl(entry: AvailabilityEntry): string {
  const title = encodeTitle(entry)
  const body = encodeDescription(entry)
  const start = toISOCompact(entry.date, entry.startTime)
  const end = toISOCompact(entry.date, entry.endTime)

  const parts = [
    'rru=addevent',
    `subject=${encodeURIComponent(title)}`,
    `body=${encodeURIComponent(body)}`,
    `startdt=${encodeURIComponent(start)}`,
    `enddt=${encodeURIComponent(end)}`,
    'path=%2Fcalendar%2Faction%2Fcompose',
  ]
  return `https://outlook.live.com/calendar/0/action/compose?${parts.join('&')}`
}

/** Yahoo Calendar "Add Event" URL */
export function yahooCalendarUrl(entry: AvailabilityEntry): string {
  const title = encodeTitle(entry)
  const desc = encodeDescription(entry)
  const st = toICSDate(entry.date, entry.startTime)
  const et = toICSDate(entry.date, entry.endTime)

  const parts = [
    'v=60',
    `title=${encodeURIComponent(title)}`,
    `desc=${encodeURIComponent(desc)}`,
    `st=${st}`,
    `et=${et}`,
  ]
  return `https://calendar.yahoo.com/?${parts.join('&')}`
}

/** Generate and download an .ics file */
export function downloadICS(entry: AvailabilityEntry): void {
  const title = encodeTitle(entry)
  const desc = encodeDescription(entry).replace(/\n/g, '\\n')
  const start = toICSDate(entry.date, entry.startTime)
  const end = toICSDate(entry.date, entry.endTime)
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `${entry.id}@breathgroup`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Breath Group Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;TZID=${entry.timezone || 'UTC'}:${start}`,
    `DTEND;TZID=${entry.timezone || 'UTC'}:${end}`,
    `DTSTAMP:${now}`,
    `UID:${uid}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `breath-group-${entry.date}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
