import { useEffect, useReducer, useRef, useCallback } from 'react'
import { blink } from '@/blink/client'
import { linkMemberUserIdById, type AppMember } from '@/features/members/api'

// ─── Public types ────────────────────────────────────────────────────────────

export interface AppUser {
  id: string
  email: string
  displayName?: string | null
}

export type AuthStatus =
  | 'initializing'          // First visit, SDK loading, no cache
  | 'unauthenticated'       // Confirmed: no session, no cache
  | 'authenticated_loading' // User confirmed, resolving member
  | 'ready'                 // User + member resolved — show app
  | 'no_access'             // User confirmed but not in app_members
  | 'blocked'               // Member is blocked

// ─── State machine ──────────────────────────────────────────────────────────

interface State {
  status: AuthStatus
  user: AppUser | null
  member: AppMember | null
}

type Action =
  | { type: 'SDK_USER_CONFIRMED'; user: AppUser }
  | { type: 'FORCE_LOGOUT' }
  | { type: 'MEMBER_FOUND'; member: AppMember }
  | { type: 'MEMBER_NOT_FOUND' }
  | { type: 'MEMBER_BLOCKED'; member: AppMember }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SDK_USER_CONFIRMED': {
      // Already ready with same user — just update user fields, stay ready
      if ((state.status === 'ready' || state.status === 'blocked') && state.user?.id === action.user.id) {
        return { ...state, user: action.user }
      }
      // Have member from cache — go straight to ready
      if (state.member && state.user?.id === action.user.id) {
        return { status: 'ready', user: action.user, member: state.member }
      }
      return { ...state, status: 'authenticated_loading', user: action.user }
    }

    case 'FORCE_LOGOUT':
      // Only explicit user logout or expired cache — never from SDK listener
      return { status: 'unauthenticated', user: null, member: null }

    case 'MEMBER_FOUND':
      if (!state.user) return state
      return { status: 'ready', user: state.user, member: action.member }

    case 'MEMBER_NOT_FOUND':
      // ONLY transition if we're in 'authenticated_loading' (fresh user, no cache).
      // If 'ready' (cached), background fetch returning empty is NOT trusted.
      if (state.status === 'authenticated_loading') {
        return { ...state, status: 'no_access', member: null }
      }
      return state

    case 'MEMBER_BLOCKED':
      return { ...state, status: 'blocked', member: action.member }

    default:
      return state
  }
}

// ─── Session cache ───────────────────────────────────────────────────────────
// The cache is the PRIMARY source of truth for "should the user be logged in".
// The Blink SDK is used to UPGRADE the state (confirm user, get fresh data),
// but it NEVER downgrades the state. Only explicit logout or cache expiry can.

const SESSION_KEY = 'bgapp_session'
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days

interface CachedSession {
  user: AppUser
  member: AppMember | null
  cachedAt: number
}

function readCache(): CachedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: CachedSession = JSON.parse(raw)
    if (!parsed?.user?.id || !parsed?.user?.email) return null
    if (Date.now() - parsed.cachedAt > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(user: AppUser, member: AppMember | null) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, member, cachedAt: Date.now() }))
  } catch { /* non-fatal */ }
}

function clearCache() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* non-fatal */ }
}

// ─── Initial state from cache ────────────────────────────────────────────────

function getInitialState(): State {
  const cached = readCache()
  if (cached?.user && cached.member) {
    return { status: 'ready', user: cached.user, member: cached.member }
  }
  if (cached?.user) {
    return { status: 'authenticated_loading', user: cached.user, member: null }
  }
  return { status: 'initializing', user: null, member: null }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAppUser() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const hasCache = useRef(!!readCache())

  // ── Auth listener ────────────────────────────────────────────────────────
  // PURPOSE: Only used to UPGRADE state — confirm user identity, get fresh
  // user data. NEVER used to log the user out. The SDK's "no user" signal
  // is completely ignored when we have a cached session.
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((authState) => {
      const rawUser = authState.user as any
      const email: string =
        rawUser?.email ??
        rawUser?.primaryEmail ??
        rawUser?.metadata?.email ??
        ''

      if (rawUser && rawUser.id && email) {
        // SDK confirmed a valid user — upgrade our state
        dispatch({
          type: 'SDK_USER_CONFIRMED',
          user: {
            id: rawUser.id,
            email: email.toLowerCase().trim(),
            displayName:
              rawUser.displayName ??
              rawUser.display_name ??
              rawUser.name ??
              rawUser.metadata?.displayName ??
              null,
          },
        })
      } else if (!rawUser && !authState.isLoading) {
        // SDK says "no user". But we have two very different cases:
        //
        // 1. We have a cache → SDK failed to validate tokens (network issue,
        //    cold CF start, etc). IGNORE. The user stays logged in. The cache
        //    is our truth. They will only be logged out when the cache expires
        //    (7 days) or they explicitly click "Sign out".
        //
        // 2. No cache → genuinely no session. Show login.
        if (!hasCache.current) {
          dispatch({ type: 'FORCE_LOGOUT' })
        }
        // If hasCache.current is true, we simply do nothing. The state
        // remains 'ready' from the cache seed. The user sees the app.
      }
    })
    return unsubscribe
  }, [])

  // ── Member resolution ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.user) return
    const isSilent = state.status === 'ready' || state.status === 'blocked'
    let cancelled = false

    async function resolveMember() {
      let lastErr: unknown
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (cancelled) return
        try {
          const rows = await blink.db.appMembers.list({ orderBy: { createdAt: 'asc' } }) as AppMember[]
          if (cancelled) return

          const normalizedEmail = state.user!.email.toLowerCase().trim()
          let found: AppMember | undefined =
            rows.find((m) => m.email.toLowerCase().trim() === normalizedEmail) ??
            rows.find((m) => m.userId === state.user!.id)

          if (found) {
            const needsLink = state.user!.id && (found.userId !== state.user!.id || found.status === 'invited')
            if (needsLink) {
              found = {
                ...found,
                userId: state.user!.id,
                status: found.status !== 'blocked' ? 'active' : found.status,
              }
            }

            if (!cancelled) {
              if (found.status === 'blocked') {
                dispatch({ type: 'MEMBER_BLOCKED', member: found })
              } else {
                dispatch({ type: 'MEMBER_FOUND', member: found })
              }
              writeCache(state.user!, found)
            }

            if (needsLink) {
              linkMemberUserIdById(found.id, state.user!.id, found.status).catch((e) =>
                console.warn('[useAppUser] linkMemberUserIdById failed (non-fatal)', e)
              )
            }
          } else if (!cancelled) {
            if (isSilent) {
              // Silent refresh: member not found — keep cached state, don't kick user
              console.warn('[useAppUser] silent refresh: member not found in DB — keeping cached state')
            } else {
              dispatch({ type: 'MEMBER_NOT_FOUND' })
              clearCache()
            }
          }
          return
        } catch (err) {
          lastErr = err
          console.error(`[useAppUser] member resolution attempt ${attempt} failed`, err)
          if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt))
        }
      }
      console.error('[useAppUser] all member resolution attempts failed', lastErr)
      // On total failure: if silent, keep cached data. If blocking, leave spinner
      // (better than showing a false "no access" screen).
    }

    resolveMember()
    return () => { cancelled = true }
  }, [state.user?.id])

  // ── Derived values ─────────────────────────────────────────────────────────

  const isLoading = state.status === 'initializing' || state.status === 'authenticated_loading'
  const isAdmin = state.member?.appRole === 'admin'
  const isBlocked = state.status === 'blocked'

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await blink.auth.signInWithEmail(email, password)
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    await blink.auth.signUp({
      email,
      password,
      ...(displayName ? { metadata: { displayName } } : {}),
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await blink.auth.signInWithGoogle({ redirectUrl: window.location.href })
  }, [])

  const signInWithApple = useCallback(async () => {
    await blink.auth.signInWithApple({ redirectUrl: window.location.href })
  }, [])

  const signInWithMicrosoft = useCallback(async () => {
    await blink.auth.signInWithMicrosoft({ redirectUrl: window.location.href })
  }, [])

  const logout = useCallback(() => {
    clearCache()
    hasCache.current = false
    blink.auth.signOut()
    dispatch({ type: 'FORCE_LOGOUT' })
  }, [])

  return {
    status: state.status,
    user: state.user,
    member: state.member,
    isLoading,
    isAdmin,
    isBlocked,
    hasAccess: state.status === 'ready',
    signInWithEmail,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithMicrosoft,
    logout,
  }
}
