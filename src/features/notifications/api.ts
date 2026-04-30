const BACKEND = 'https://60lyovrv.backend.blink.new'

export interface Notification {
  id: string
  userId: string
  type: 'attendee_joined' | 'attendee_left' | 'sitter_created'
  entryId: string | null
  actorName: string
  actorEmail: string | null
  message: string
  read: number
  createdAt: string
}

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

export async function listNotifications(userId: string): Promise<Notification[]> {
  return backendFetch<Notification[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
  })
}

export async function markNotificationRead(id: string): Promise<void> {
  await backendFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await backendFetch('/api/notifications/mark-all-read', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}
