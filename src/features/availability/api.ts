import { blink } from '@/blink/client'
import { detectTimezone } from './timezone'

export type AvailabilityRole = 'breather' | 'sitter'
export type RecurrenceRule = 'weekly' | 'biweekly' | 'monthly'

export interface AvailabilityEntry {
  id: string
  name: string
  email: string
  role: AvailabilityRole
  date: string
  startTime: string
  endTime: string
  timezone: string
  notes: string | null
  createdAt: string
  updatedAt: string
  userId: string | null
  /** For sitter entries: max number of breathers allowed */
  maxAttendees: number | null
  /** Links recurring events together */
  recurringGroupId: string | null
  /** e.g. 'weekly', 'biweekly', 'monthly' */
  recurrenceRule: RecurrenceRule | null
}

export interface AvailabilityInput {
  name: string
  email: string
  role: AvailabilityRole
  date: string
  startTime: string
  endTime: string
  timezone: string
  notes?: string
  userId?: string | null
  maxAttendees?: number | null
  recurringGroupId?: string | null
  recurrenceRule?: RecurrenceRule | null
}

const BACKEND = 'https://60lyovrv.backend.blink.new'

async function backendFetch<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`Backend ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

/** Coerce a raw backend/DB row (snake_case) into a camelCase AvailabilityEntry.
 *  The Blink SDK handles this automatically for blink.db calls, but
 *  direct backendFetch responses are raw JSON and need manual mapping.
 */
function normalizeEntry(raw: Record<string, unknown>): AvailabilityEntry {
  return {
    id: (raw.id ?? '') as string,
    name: (raw.name ?? '') as string,
    email: (raw.email ?? '') as string,
    role: (raw.role ?? 'breather') as AvailabilityRole,
    date: (raw.date ?? '') as string,
    startTime: (raw.startTime ?? raw.start_time ?? '') as string,
    endTime: (raw.endTime ?? raw.end_time ?? '') as string,
    timezone: (raw.timezone ?? 'UTC') as string,
    notes: (raw.notes ?? null) as string | null,
    createdAt: (raw.createdAt ?? raw.created_at ?? '') as string,
    updatedAt: (raw.updatedAt ?? raw.updated_at ?? '') as string,
    userId: (raw.userId ?? raw.user_id ?? null) as string | null,
    maxAttendees: (raw.maxAttendees ?? raw.max_attendees ?? null) as number | null,
    recurringGroupId: (raw.recurringGroupId ?? raw.recurring_group_id ?? null) as string | null,
    recurrenceRule: (raw.recurrenceRule ?? raw.recurrence_rule ?? null) as RecurrenceRule | null,
  }
}

function normalizeInput(input: AvailabilityInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone || detectTimezone(),
    notes: input.notes?.trim() || null,
    updatedAt: new Date().toISOString(),
    userId: input.userId ?? null,
    maxAttendees: input.maxAttendees ?? null,
    recurringGroupId: input.recurringGroupId ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
  }
}

export async function listAvailabilityEntries(): Promise<AvailabilityEntry[]> {
  const entries = await blink.db.availabilityEntries.list()
  return (entries as AvailabilityEntry[]).sort((a, b) => {
    const left = `${a.date}T${a.startTime}`
    const right = `${b.date}T${b.startTime}`
    return left.localeCompare(right)
  })
}

export async function createAvailabilityEntry(input: AvailabilityInput): Promise<AvailabilityEntry> {
  const raw = await backendFetch<Record<string, unknown>>('/api/entries', {
    method: 'POST',
    body: JSON.stringify({
      ...normalizeInput(input),
      createdAt: new Date().toISOString(),
    }),
  })
  return normalizeEntry(raw)
}

export async function updateAvailabilityEntry(id: string, input: AvailabilityInput): Promise<AvailabilityEntry> {
  const raw = await backendFetch<Record<string, unknown>>(`/api/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeInput(input)),
  })
  return normalizeEntry(raw)
}

export async function deleteAvailabilityEntry(id: string): Promise<void> {
  await backendFetch<{ ok: boolean }>(`/api/entries/${id}`, { method: 'DELETE' })
}

/** Update all entries in a recurring group */
export async function updateRecurringGroup(
  recurringGroupId: string,
  input: AvailabilityInput,
  fromDate: string,
): Promise<void> {
  const all = await listAvailabilityEntries()
  const siblings = all.filter(
    (e) => e.recurringGroupId === recurringGroupId && e.date >= fromDate,
  )
  await Promise.all(siblings.map((e) => updateAvailabilityEntry(e.id, { ...input, date: e.date })))
}

/** Delete all entries in a recurring group */
export async function deleteRecurringGroup(
  recurringGroupId: string,
  fromDate: string,
): Promise<void> {
  const all = await listAvailabilityEntries()
  const siblings = all.filter(
    (e) => e.recurringGroupId === recurringGroupId && e.date >= fromDate,
  )
  await Promise.all(siblings.map((e) => deleteAvailabilityEntry(e.id)))
}
