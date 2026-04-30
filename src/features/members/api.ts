import { blink } from '@/blink/client'

export type AppRole = 'admin' | 'member'
export type Capabilities = 'both' | 'sitter' | 'breather'
export type MemberStatus = 'invited' | 'active' | 'blocked' | 'requested'

export interface AppMember {
  id: string
  email: string
  appRole: AppRole
  capabilities: Capabilities
  status: MemberStatus
  userId: string | null
  createdAt: string
  lastSignIn?: string | null
  welcomeEmailCount?: number
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

export async function listMembers(): Promise<AppMember[]> {
  const [memberRows, userRows] = await Promise.all([
    blink.db.appMembers.list({ orderBy: { createdAt: 'asc' } }),
    blink.db.users.list(),
  ])
  const signInByEmail = new Map<string, string>()
  for (const u of userRows as { email: string; lastSignIn?: string | null }[]) {
    if (u.email && u.lastSignIn) signInByEmail.set(u.email.toLowerCase(), u.lastSignIn)
  }
  return (memberRows as AppMember[]).map((m) => ({
    ...m,
    lastSignIn: signInByEmail.get(m.email.toLowerCase()) ?? null,
    welcomeEmailCount: Number((m as any).welcomeEmailCount) || 0,
  }))
}

export async function getMemberByEmail(email: string): Promise<AppMember | null> {
  if (!email) return null
  const normalized = email.toLowerCase().trim()
  // Fetch all and filter client-side — avoids server-side where filter failing for unauthenticated requests
  const rows = await blink.db.appMembers.list({ orderBy: { createdAt: 'asc' } })
  const match = (rows as AppMember[]).find(
    (m) => m.email.toLowerCase().trim() === normalized,
  )
  return match ?? null
}

export async function getMemberByUserId(userId: string): Promise<AppMember | null> {
  if (!userId) return null
  const rows = await blink.db.appMembers.list({ orderBy: { createdAt: 'asc' } })
  const match = (rows as AppMember[]).find((m) => m.userId === userId)
  return match ?? null
}

export async function createMember(data: {
  email: string
  appRole?: AppRole
  capabilities?: Capabilities
}): Promise<AppMember> {
  const id = `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return backendFetch<AppMember>('/api/members', {
    method: 'POST',
    body: JSON.stringify({
      id,
      email: data.email.toLowerCase().trim(),
      appRole: data.appRole ?? 'member',
      capabilities: data.capabilities ?? 'both',
      status: 'invited',
      userId: null,
      createdAt: new Date().toISOString(),
    }),
  })
}

export async function updateMember(
  id: string,
  data: Partial<Pick<AppMember, 'appRole' | 'capabilities' | 'status' | 'userId'>>,
): Promise<AppMember> {
  return backendFetch<AppMember>(`/api/members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Link a signed-in user's auth ID to their member record (called on first sign-in) */
export async function linkMemberUserId(email: string, userId: string): Promise<void> {
  // Look up member id without a full list — reuse getMemberByEmail which fetches all once
  const member = await getMemberByEmail(email)
  if (!member) return
  if (member.userId === userId) return
  await backendFetch<AppMember>(`/api/members/${member.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, status: member.status === 'blocked' ? 'blocked' : 'active' }),
  })
}

/** Link using a known member id — skips the lookup fetch entirely */
export async function linkMemberUserIdById(memberId: string, userId: string, currentStatus: string): Promise<void> {
  await backendFetch<AppMember>(`/api/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, status: currentStatus === 'blocked' ? 'blocked' : 'active' }),
  })
}

/** Remove member record + all their availability entries + attendee records */
export async function removeMember(memberId: string, userId: string | null): Promise<void> {
  await backendFetch<{ ok: boolean }>(`/api/members/${memberId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  })
}
