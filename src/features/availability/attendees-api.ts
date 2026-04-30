import { blink } from '@/blink/client'

export interface SessionAttendee {
  id: string
  entryId: string
  name: string
  email: string
  createdAt: string
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

export async function listAttendees(entryId: string): Promise<SessionAttendee[]> {
  const attendees = await blink.db.sessionAttendees.list({
    where: { entryId },
  })
  return attendees as SessionAttendee[]
}

export async function addAttendee(entryId: string, name: string, email: string): Promise<SessionAttendee> {
  return backendFetch<SessionAttendee>('/api/attendees', {
    method: 'POST',
    body: JSON.stringify({
      entryId,
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    }),
  })
}

export async function removeAttendee(id: string): Promise<void> {
  await backendFetch<{ ok: boolean }>(`/api/attendees/${id}`, { method: 'DELETE' })
}

export async function listAllAttendees(): Promise<SessionAttendee[]> {
  const attendees = await blink.db.sessionAttendees.list()
  return attendees as SessionAttendee[]
}
