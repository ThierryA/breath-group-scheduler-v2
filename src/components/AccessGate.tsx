import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { AppMember } from '@/features/members/api'
import type { AuthStatus } from '@/hooks/useAppUser'
import { blink } from '@/blink/client'
// BlinkAuthError not exported from SDK — use duck typing on error messages

interface AccessGateProps {
  status: AuthStatus
  user: { id: string; email: string; displayName?: string | null } | null
  member: AppMember | null | undefined
  onSignInWithEmail: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, displayName?: string) => Promise<void>
  onSignInWithGoogle: () => Promise<void>
  onSignInWithApple: () => Promise<void>
  onSignInWithMicrosoft: () => Promise<void>
  onLogout: () => void
  onRetry?: () => void
  children: React.ReactNode
}

type AuthMode = 'signin' | 'signup' | 'forgot'
type RequestState = 'idle' | 'expanded' | 'submitting' | 'success' | 'already_exists' | 'error'

async function postMemberRequest(payload: {
  email: string
  firstName: string
  lastName: string
}): Promise<{ ok: boolean; alreadyExists: boolean }> {
  const res = await fetch('https://60lyovrv.backend.blink.new/api/member-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 409) return { ok: false, alreadyExists: true }
  if (!res.ok) throw new Error('Request failed')
  return { ok: true, alreadyExists: false }
}

// ── SSO Button ────────────────────────────────────────────────────────────────

function SSOButton({
  onClick,
  icon,
  label,
  disabled,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  )
}

// ── Google Icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.9-49 188.9-49 30.8 0 108.2 2.6 168.6 73.6zm-107.4-180.9c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}

// ── Auth Form ─────────────────────────────────────────────────────────────────

function AuthForm({
  onSignInWithEmail,
  onSignUp,
  onSignInWithGoogle,
  onSignInWithApple,
  onSignInWithMicrosoft,
}: {
  onSignInWithEmail: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, displayName?: string) => Promise<void>
  onSignInWithGoogle: () => Promise<void>
  onSignInWithApple: () => Promise<void>
  onSignInWithMicrosoft: () => Promise<void>
}) {
  const [mode, _setMode] = useState<AuthMode>(() => {
    const h = window.location.hash.replace('#', '')
    if (h === 'register') return 'signup'
    if (h === 'forgot') return 'forgot'
    return 'signin'
  })

  function setMode(m: AuthMode) {
    _setMode(m)
    const hash = m === 'signup' ? '#register' : m === 'forgot' ? '#forgot' : ''
    window.history.replaceState(null, '', window.location.pathname + window.location.search + hash)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ssoLoading, setSsoLoading] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  function clearError() { setError(null) }

  function friendlyAuthError(err: unknown): string {
    const msg = (err as any)?.message ?? ''
    const code = (err as any)?.code ?? ''
    if (code === 'INVALID_CREDENTIALS' || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
      return 'Incorrect email or password.'
    }
    if (code === 'EMAIL_ALREADY_EXISTS' || msg.toLowerCase().includes('already exists')) {
      return 'An account with this email already exists. Try signing in.'
    }
    if (code === 'WEAK_PASSWORD' || msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('password')) {
      return 'Password is too weak. Use at least 8 characters.'
    }
    if (code === 'RATE_LIMITED' || msg.toLowerCase().includes('rate')) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    if (code === 'NETWORK_ERROR' || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
      return 'Network error. Check your connection and try again.'
    }
    if (msg) return msg
    return 'Something went wrong. Please try again.'
  }

  function isPopupCanceled(err: unknown): boolean {
    const code = (err as any)?.code ?? ''
    const msg = (err as any)?.message ?? ''
    return code === 'POPUP_CANCELED' || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('closed')
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    setLoading(true)
    try {
      if (mode === 'signin') {
        await onSignInWithEmail(email.trim(), password)
      } else {
        await onSignUp(email.trim(), password, displayName.trim() || undefined)
      }
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    setLoading(true)
    try {
      await fetch('https://60lyovrv.backend.blink.new/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setResetSent(true)
    } catch {
      setError('Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSSO(provider: 'google' | 'apple' | 'microsoft') {
    clearError()
    setSsoLoading(provider)
    try {
      if (provider === 'google') await onSignInWithGoogle()
      else if (provider === 'apple') await onSignInWithApple()
      else await onSignInWithMicrosoft()
    } catch (err) {
      if (!isPopupCanceled(err)) {
        setError(friendlyAuthError(err))
      }
    } finally {
      setSsoLoading(null)
    }
  }

  const anyLoading = loading || !!ssoLoading

  // ── Forgot password view ──────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <div className="w-full max-w-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Reset your password</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {resetSent ? (
          <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Check your inbox — a reset link is on its way to <strong>{email}</strong>.
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
              disabled={loading}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Sending…
                </span>
              ) : 'Send reset link'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => { setMode('signin'); setResetSent(false); clearError() }}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      {/* SSO buttons */}
      <div className="space-y-2">
        <SSOButton
          onClick={() => handleSSO('google')}
          icon={<GoogleIcon />}
          label={ssoLoading === 'google' ? 'Connecting…' : 'Continue with Google'}
          disabled={anyLoading}
        />
        <SSOButton
          onClick={() => handleSSO('apple')}
          icon={<AppleIcon />}
          label={ssoLoading === 'apple' ? 'Connecting…' : 'Continue with Apple'}
          disabled={anyLoading}
        />
        <SSOButton
          onClick={() => handleSSO('microsoft')}
          icon={<MicrosoftIcon />}
          label={ssoLoading === 'microsoft' ? 'Connecting…' : 'Continue with Microsoft'}
          disabled={anyLoading}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Email / Password form */}
      <form onSubmit={handleEmailSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); clearError() }}
            placeholder="Your name"
            required
            autoComplete="name"
            disabled={anyLoading}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError() }}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={anyLoading}
          className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            placeholder={mode === 'signup' ? 'Choose a password' : 'Password'}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            disabled={anyLoading}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); clearError() }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-primary transition"
              tabIndex={-1}
            >
              Forgot?
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={anyLoading}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
            </span>
          ) : (
            mode === 'signin' ? 'Sign in' : 'Create account'
          )}
        </button>
      </form>

      {/* Mode toggle */}
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'signin' ? (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signup'); clearError() }}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signin'); clearError() }}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  )
}

// ── Main AccessGate ───────────────────────────────────────────────────────────

export function AccessGate({
  status,
  user,
  member,
  onSignInWithEmail,
  onSignUp,
  onSignInWithGoogle,
  onSignInWithApple,
  onSignInWithMicrosoft,
  onLogout,
  onRetry,
  children,
}: AccessGateProps) {
  const [requestEmail, setRequestEmail] = useState('')
  const [requestFirstName, setRequestFirstName] = useState('')
  const [requestLastName, setRequestLastName] = useState('')
  const [requestState, _setRequestState] = useState<RequestState>(() => {
    const h = window.location.hash.replace('#', '')
    return h === 'request' ? 'expanded' : 'idle'
  })

  function setRequestState(s: RequestState) {
    _setRequestState(s)
    const hash = s === 'expanded' ? '#request' : ''
    if (s === 'expanded' || s === 'idle') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + hash)
    }
  }

  // ── Password reset token handler ─────────────────────────────────────────
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('reset_token')
  })
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    if (!resetToken) return
    // Strip the token from the URL immediately
    const params = new URLSearchParams(window.location.search)
    params.delete('reset_token')
    const newSearch = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`)
  }, [resetToken])

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (resetNewPassword.length < 8) { setResetError('Password must be at least 8 characters'); return }
    if (resetNewPassword !== resetConfirmPassword) { setResetError('Passwords do not match'); return }
    setResetLoading(true)
    setResetError(null)
    try {
      await blink.auth.confirmPasswordReset(resetToken!, resetNewPassword)
      setResetDone(true)
      setResetToken(null)
    } catch (err: any) {
      setResetError(err?.message ?? 'Failed to reset password. The link may have expired.')
    } finally {
      setResetLoading(false)
    }
  }

  if (resetToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-2xl font-semibold text-foreground">Set a new password</h1>
          <p className="text-sm text-muted-foreground">Choose a new password for your Breath Group account.</p>
        </div>
        <form onSubmit={handleResetSubmit} className="w-full max-w-sm space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New password</label>
            <input
              type="password"
              value={resetNewPassword}
              onChange={(e) => { setResetNewPassword(e.target.value); setResetError(null) }}
              placeholder="Min. 8 characters"
              required
              autoFocus
              autoComplete="new-password"
              disabled={resetLoading}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</label>
            <input
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => { setResetConfirmPassword(e.target.value); setResetError(null) }}
              placeholder="Repeat new password"
              required
              autoComplete="new-password"
              disabled={resetLoading}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
          {resetError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{resetError}</p>
          )}
          <button
            type="submit"
            disabled={resetLoading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {resetLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Saving…
              </span>
            ) : 'Set new password'}
          </button>
        </form>
      </div>
    )
  }

  // Handle URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const request = params.get('request')
    if (!request) return

    params.delete('request')
    const newSearch = params.toString()
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`
    window.history.replaceState(null, '', newUrl)

    setTimeout(() => {
      if (request === 'accepted') {
        toast.success('Your access request was approved! Please sign in.')
      } else if (request === 'already') {
        toast('You already have access or a pending request.')
      } else if (request === 'declined') {
        toast.error('Your access request was declined.')
      } else if (request === 'notfound') {
        toast.error('Request not found.')
      }
    }, 300)
  }, [])

  function resetForm() {
    setRequestState('idle')
    setRequestEmail('')
    setRequestFirstName('')
    setRequestLastName('')
  }

  async function handleRequestSubmit(e: React.FormEvent, email: string) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setRequestState('submitting')
    try {
      const result = await postMemberRequest({
        email: trimmed,
        firstName: requestFirstName.trim(),
        lastName: requestLastName.trim(),
      })
      if (result.alreadyExists) {
        setRequestState('already_exists')
      } else {
        setRequestState('success')
      }
    } catch {
      setRequestState('error')
    }
  }

  // ── State-machine rendering ───────────────────────────────────────────────

  if (resetDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-950/30">
          <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="font-serif text-xl font-semibold text-foreground">Password updated</h1>
          <p className="text-sm text-muted-foreground">Your password has been reset. You can now sign in.</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await blink.auth.signOut()
            setResetDone(false)
          }}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    )
  }

  if (status === 'ready') {
    return <>{children}</>
  }

  if (status === 'initializing' || status === 'authenticated_loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'blocked') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="font-serif text-xl font-semibold text-foreground">Access suspended</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been suspended. Contact an admin for help.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted"
        >
          Sign out
        </button>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Breath Group Scheduler
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to view and manage breathwork sessions.
          </p>
        </div>

        {requestState === 'idle' && (
          <>
            <AuthForm
              onSignInWithEmail={onSignInWithEmail}
              onSignUp={onSignUp}
              onSignInWithGoogle={onSignInWithGoogle}
              onSignInWithApple={onSignInWithApple}
              onSignInWithMicrosoft={onSignInWithMicrosoft}
            />

            {/* Divider */}
            <div className="flex w-full max-w-sm items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </>
        )}

        {/* Request access */}
        {requestState === 'idle' && (
          <button
            type="button"
            onClick={() => setRequestState('expanded')}
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Request Access
          </button>
        )}

        {requestState === 'expanded' && (
          <form
            onSubmit={(e) => handleRequestSubmit(e, requestEmail)}
            className="flex w-full max-w-sm flex-col gap-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={requestFirstName}
                onChange={(e) => setRequestFirstName(e.target.value)}
                placeholder="First name"
                required
                autoFocus
                className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground outline-none transition focus:ring-1 focus:ring-ring w-full"
              />
              <input
                type="text"
                value={requestLastName}
                onChange={(e) => setRequestLastName(e.target.value)}
                placeholder="Last name"
                required
                className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground outline-none transition focus:ring-1 focus:ring-ring w-full"
              />
            </div>
            <input
              type="email"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground outline-none transition focus:ring-1 focus:ring-ring w-full"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Send Request
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {requestState === 'submitting' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Sending request…
          </div>
        )}

        {requestState === 'success' && (
          <p className="w-full max-w-sm rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Request sent! You'll receive an email once approved.
          </p>
        )}

        {requestState === 'already_exists' && (
          <p className="w-full max-w-sm rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            This email already has access or a pending request.
          </p>
        )}

        {requestState === 'error' && (
          <div className="flex w-full max-w-sm flex-col gap-2">
            <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to send request. Please try again.
            </p>
            <button
              type="button"
              onClick={() => setRequestState('expanded')}
              className="text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    )
  }

  // status === 'no_access'
  const autoEmail = user?.email ?? ''

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="font-serif text-xl font-semibold text-foreground">Access required</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? `${user.email} hasn't been added to this group yet.`
            : "Your account hasn't been added to this group yet."}
        </p>
      </div>

      <div className="w-full max-w-xs">
        {(requestState === 'idle' || requestState === 'expanded') && (
          <form
            onSubmit={(e) => handleRequestSubmit(e, autoEmail)}
            className="flex flex-col gap-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={requestFirstName}
                onChange={(e) => setRequestFirstName(e.target.value)}
                placeholder="First name"
                required
                autoFocus
                className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground outline-none transition focus:ring-1 focus:ring-ring w-full"
              />
              <input
                type="text"
                value={requestLastName}
                onChange={(e) => setRequestLastName(e.target.value)}
                placeholder="Last name"
                required
                className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground outline-none transition focus:ring-1 focus:ring-ring w-full"
              />
            </div>
            <input
              type="email"
              value={autoEmail}
              readOnly
              className="border border-border rounded-md px-3 py-2 text-sm bg-muted text-foreground outline-none w-full cursor-default"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Request Access
            </button>
          </form>
        )}

        {requestState === 'submitting' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Sending request…
          </div>
        )}

        {requestState === 'success' && (
          <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Request sent! You'll receive an email once approved.
          </p>
        )}

        {requestState === 'already_exists' && (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            This email already has access or a pending request.
          </p>
        )}

        {requestState === 'error' && (
          <div className="flex flex-col gap-2">
            <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to send request. Please try again.
            </p>
            <button
              type="button"
              onClick={() => setRequestState('idle')}
              className="text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
