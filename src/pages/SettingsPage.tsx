import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronLeft, User, Bell, Save, Mail, Smartphone, Sun, Moon, Monitor, Lock, KeyRound } from 'lucide-react'
import { blink } from '@/blink/client'
import { PushToggle } from '@/features/notifications/PushToggle'
import { cn } from '@/lib/utils'
import type { Theme } from '@/hooks/useTheme'

interface NotificationPrefs {
  emailEnabled: boolean
}

// Simple fetch helper for notification prefs stored in user metadata
async function getNotifPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const user = await blink.auth.me() as any
    const meta = typeof user?.metadata === 'string'
      ? JSON.parse(user.metadata)
      : user?.metadata ?? {}
    return { emailEnabled: meta.emailNotifications !== false }
  } catch {
    return { emailEnabled: true }
  }
}

interface SettingsPageProps {
  user: { id: string; email: string; displayName?: string | null }
  onBack: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" />, description: 'Always use light mode' },
  { value: 'dark',  label: 'Dark',  icon: <Moon className="h-4 w-4" />, description: 'Always use dark mode' },
  { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" />, description: 'Follow your device setting' },
]

export function SettingsPage({ user, onBack, theme, onThemeChange }: SettingsPageProps) {
  const queryClient = useQueryClient()

  // Parse firstName / lastName from displayName
  const [displayName, setDisplayName] = useState(user.displayName ?? '')

  const [saving, setSaving] = useState(false)
  const [emailNotif, setEmailNotif] = useState(true)
  const [emailPrefLoaded, setEmailPrefLoaded] = useState(false)

  // Load email notification preference from user metadata
  const { data: notifPrefs } = useQuery({
    queryKey: ['notifPrefs', user.id],
    queryFn: () => getNotifPrefs(user.id),
  })

  useEffect(() => {
    if (notifPrefs) {
      setEmailNotif(notifPrefs.emailEnabled)
      setEmailPrefLoaded(true)
    }
  }, [notifPrefs])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) { toast.error('Display name cannot be empty'); return }
    setSaving(true)
    try {
      await blink.auth.updateMe({ displayName: trimmed })
      toast.success('Profile updated')
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // ── Password change state ─────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setChangingPassword(true)
    try {
      await blink.auth.changePassword(currentPassword, newPassword)
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong')) {
        toast.error('Current password is incorrect')
      } else {
        toast.error(msg || 'Failed to update password')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleSendPasswordReset() {
    setSendingReset(true)
    try {
      const res = await fetch('https://60lyovrv.backend.blink.new/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResetSent(true)
      toast.success('Password reset email sent')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send reset email')
    } finally {
      setSendingReset(false)
    }
  }

  async function handleEmailNotifChange(enabled: boolean) {
    setEmailNotif(enabled)
    try {
      const current = await blink.auth.me() as any
      const meta = typeof current?.metadata === 'string'
        ? JSON.parse(current.metadata)
        : current?.metadata ?? {}
      await blink.auth.updateMe({ metadata: { ...meta, emailNotifications: enabled } })
      toast.success(enabled ? 'Email notifications enabled' : 'Email notifications disabled')
    } catch {
      setEmailNotif(!enabled) // revert
      toast.error('Failed to update email preference')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <h1 className="font-serif text-base font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Profile Section ── */}
        <section className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-5 py-3">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="px-5 py-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This name appears on your sessions and in the attendee list.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email address
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />Read-only
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Email is managed by your sign-in provider and cannot be changed here.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </section>

        {/* ── Security Section ── */}
        <section className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-5 py-3">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Security</h2>
          </div>

          <div className="divide-y divide-border">
            {/* Change password */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Change password</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter your current password then choose a new one.
                </p>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={changingPassword}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    autoComplete="new-password"
                    disabled={changingPassword}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    autoComplete="new-password"
                    disabled={changingPassword}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {changingPassword ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password reset */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Forgot your password?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  We'll send a reset link to <span className="font-medium text-foreground">{user.email}</span>.
                </p>
                {resetSent && (
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    Reset email sent — check your inbox.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={sendingReset || resetSent}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReset ? 'Sending…' : resetSent ? 'Sent ✓' : 'Send reset email'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Notification Preferences ── */}
        <section className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-5 py-3">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          </div>

          <div className="divide-y divide-border">
            {/* Email notifications */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email notifications</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Receive emails when someone joins your session, a sitter is created for your breather slot, or a breather leaves.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {emailPrefLoaded ? (
                  <button
                    type="button"
                    onClick={() => handleEmailNotifChange(!emailNotif)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      emailNotif ? 'bg-primary' : 'bg-muted',
                    )}
                    role="switch"
                    aria-checked={emailNotif}
                  >
                    <span className={cn(
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
                      emailNotif ? 'translate-x-4' : 'translate-x-0',
                    )} />
                  </button>
                ) : (
                  <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
                )}
              </div>
            </div>

            {/* Push notifications */}
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <Smartphone className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Push notifications</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Receive browser push notifications in real time, even when the app isn't open. Works on desktop and mobile when the app is installed.
                  </p>
                  <div className="mt-3">
                    <PushToggle userId={user.id} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-5 py-3">
            <Sun className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
          </div>
          <div className="px-5 py-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onThemeChange(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition',
                    theme === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <span className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full',
                    theme === opt.value ? 'bg-primary/10' : 'bg-muted',
                  )}>
                    {opt.icon}
                  </span>
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Account info ── */}
        <section className="rounded-lg border border-border/60 bg-muted/10 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">About your account</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Your display name is shown on all sessions you create and when you join sessions.</li>
            <li>Email address is linked to your sign-in provider (Google, Apple, email, etc.) and cannot be changed here.</li>
            <li>Push notifications require browser permission and work best when the app is installed on your device.</li>
          </ul>
        </section>

      </div>
    </div>
  )
}
