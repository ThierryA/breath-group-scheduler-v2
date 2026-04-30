/**
 * Timezone utilities for converting availability entries between timezones.
 * All entries are stored with their original timezone. When viewing,
 * we convert to the viewer's chosen display timezone.
 */

/** Common timezones grouped by region */
export const TIMEZONE_GROUPS: { label: string; zones: { value: string; label: string }[] }[] = [
  {
    label: 'Americas',
    zones: [
      { value: 'America/New_York', label: 'New York (EST/EDT)' },
      { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
      { value: 'America/Denver', label: 'Denver (MST/MDT)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
      { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
      { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
      { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
      { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
    ],
  },
  {
    label: 'Europe',
    zones: [
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
      { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
      { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
      { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
      { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
      { value: 'Europe/Athens', label: 'Athens (EET/EEST)' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    ],
  },
  {
    label: 'Asia & Pacific',
    zones: [
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)' },
      { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
      { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
    ],
  },
  {
    label: 'Africa & Middle East',
    zones: [
      { value: 'Africa/Cairo', label: 'Cairo (EET)' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
      { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
      { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
      { value: 'Asia/Jerusalem', label: 'Jerusalem (IST/IDT)' },
      { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
    ],
  },
]

/** Detect browser timezone */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/** Get short timezone abbreviation for display */
export function getTimezoneAbbr(tz: string, date?: Date): string {
  try {
    const d = date || new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(d)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz
  } catch {
    return tz
  }
}

/**
 * Convert a date + time from one timezone to another.
 * Returns { date: 'YYYY-MM-DD', time: 'HH:mm' } in the target timezone.
 */
export function convertTime(
  date: string,
  time: string,
  fromTz: string,
  toTz: string
): { date: string; time: string } {
  if (fromTz === toTz) return { date, time }

  // Build a datetime string and parse in the source timezone
  const dtStr = `${date}T${time}:00`

  // Create a formatter in the source timezone to get the UTC offset
  const sourceFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: toTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  // Parse as UTC first, then adjust
  const utcDate = new Date(dtStr + 'Z')

  // Get the source timezone offset by parsing in source tz
  const sourceParts = extractParts(sourceFormatter, utcDate)
  const sourceDate = new Date(
    `${sourceParts.year}-${sourceParts.month}-${sourceParts.day}T${sourceParts.hour}:${sourceParts.minute}:${sourceParts.second}Z`
  )
  const sourceOffset = sourceDate.getTime() - utcDate.getTime()

  // The actual UTC time = utcDate - sourceOffset (we need to undo the source tz)
  const actualUtc = new Date(utcDate.getTime() - sourceOffset)

  // Now format in target timezone
  const targetParts = extractParts(targetFormatter, actualUtc)

  return {
    date: `${targetParts.year}-${targetParts.month}-${targetParts.day}`,
    time: `${targetParts.hour}:${targetParts.minute}`,
  }
}

function extractParts(formatter: Intl.DateTimeFormat, date: Date) {
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === '24' ? '00' : get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Find the label for a timezone value */
export function getTimezoneLabel(tz: string): string {
  for (const group of TIMEZONE_GROUPS) {
    const found = group.zones.find((z) => z.value === tz)
    if (found) return found.label
  }
  return tz.replace(/_/g, ' ').split('/').pop() ?? tz
}
