import { useState, useRef, useEffect } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  EllipsisHorizontalIcon,
  GlobeAltIcon,
  ChevronDownIcon,
} from '@heroicons/react/20/solid'
import { LogIn, LogOut, UserCircle2, Wind, Hand, Shield, BookOpen, ChevronDown, X, Smartphone, Settings, Sparkles } from 'lucide-react'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { TIMEZONE_GROUPS } from '@/features/availability/timezone'
import type { Capabilities } from '@/features/members/api'
import { cn } from '@/lib/utils'

export type RoleFilter = 'all' | 'sitter' | 'breather'
export type MineFilter = 'all' | 'created' | 'attending' | 'daytime'

interface CalendarToolbarProps {
  displayTimezone: string
  onTimezoneChange: (tz: string) => void
  onAddSitter: () => void
  onAddBreather: () => void
  user: { id: string; email: string; displayName?: string | null } | null
  onLogin: () => void
  onLogout: () => void
  isAdmin?: boolean
  capabilities?: Capabilities | null
  onNavigateAdmin?: () => void
  onNavigateDocs?: () => void
  onNavigateInstall?: () => void
  onNavigateSettings?: () => void
  userId?: string
  // Filter props
  roleFilter: RoleFilter
  onRoleFilterChange: (f: RoleFilter) => void
  mineFilter: MineFilter
  onMineFilterChange: (f: MineFilter) => void
  onMyMatchesClick?: () => void
  myMatchesCount?: number
}

function CreateDropdown({
  onAddSitter,
  onAddBreather,
  showBreather,
}: {
  onAddSitter: () => void
  onAddBreather: () => void
  showBreather: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]"
      >
        <span>+ New</span>
        <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 origin-top-right overflow-hidden rounded-lg border border-border bg-background shadow-lg z-[200] animate-in fade-in-0 zoom-in-95">
          <button
            type="button"
            onClick={() => { setOpen(false); onAddSitter() }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
          >
            <Hand className="h-4 w-4 text-accent" />
            <div>
              <span className="font-medium">Sitter session</span>
              <span className="block text-[11px] text-muted-foreground">Offer to sit for breathers</span>
            </div>
          </button>
          {showBreather && (
            <>
              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={() => { setOpen(false); onAddBreather() }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <Wind className="h-4 w-4 text-primary" />
                <div>
                  <span className="font-medium">Breather availability</span>
                  <span className="block text-[11px] text-muted-foreground">Request a sitter for your session</span>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Dropdown for the "mine" filter in the filter bar */
function MineFilterDropdown({
  mineFilter,
  onMineFilterChange,
}: {
  mineFilter: MineFilter
  onMineFilterChange: (f: MineFilter) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const options: { value: MineFilter; label: string; description: string }[] = [
    { value: 'all', label: 'All sessions', description: 'Show everyone\'s sessions' },
    { value: 'created', label: 'Sessions I Created', description: 'Sessions you posted' },
    { value: 'attending', label: 'Sessions I\'m Attending', description: 'Sessions you joined as breather' },
    { value: 'daytime', label: 'Daytime only', description: 'Sessions between 6 AM – 10 PM (your timezone)' },
  ]

  const active = mineFilter !== 'all'
  const activeLabel = options.find((o) => o.value === mineFilter)?.label ?? 'Only mine'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition',
          active
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground'
        )}
      >
        {active ? activeLabel : 'Only mine'}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 origin-top-right overflow-hidden rounded-lg border border-border bg-background shadow-lg z-[200] animate-in fade-in-0 zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onMineFilterChange(opt.value); setOpen(false) }}
              className={cn(
                'flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-muted',
                opt.value === mineFilter && 'bg-primary/5'
              )}
            >
              <span className={cn('text-[12px] font-medium', opt.value === mineFilter ? 'text-primary' : 'text-foreground')}>
                {opt.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{opt.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Full-screen mobile user menu panel (mirrors notification panel pattern) */
function MobileUserPanel({
  user,
  onLogout,
  onNavigateDocs,
  onNavigateAdmin,
  onNavigateInstall,
  onNavigateSettings,
  isAdmin,
  displayTimezone,
  onTimezoneChange,
  onLogin,
  open,
  onClose,
}: {
  user: { id: string; email: string; displayName?: string | null } | null
  onLogout: () => void
  onNavigateDocs?: () => void
  onNavigateAdmin?: () => void
  onNavigateInstall?: () => void
  onNavigateSettings?: () => void
  isAdmin?: boolean
  displayTimezone: string
  onTimezoneChange: (tz: string) => void
  onLogin: () => void
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-[70] flex flex-col bg-background animate-in fade-in-0 slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Menu</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* User section */}
        {user ? (
          <div className="border-b border-border px-4 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Signed in as</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{user.displayName || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        ) : (
          <div className="border-b border-border px-4 py-4">
            <button
              type="button"
              onClick={() => { onClose(); onLogin() }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in
            </button>
          </div>
        )}

        {/* Timezone */}
        <div className="border-b border-border px-4 py-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <GlobeAltIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Timezone
          </div>
          <select
            value={displayTimezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-1 focus:ring-ring"
            title="Display timezone"
          >
            {TIMEZONE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.zones.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Navigation links */}
        {user && (
          <>
          <div className="px-4 py-3 space-y-1">
            {onNavigateDocs && (
              <button
                type="button"
                onClick={() => { onClose(); onNavigateDocs() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Documentation
              </button>
            )}
            {onNavigateInstall && (
              <button
                type="button"
                onClick={() => { onClose(); onNavigateInstall() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Install App
              </button>
            )}
            {onNavigateSettings && (
              <button
                type="button"
                onClick={() => { onClose(); onNavigateSettings() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </button>
            )}
            {isAdmin && onNavigateAdmin && (
              <button
                type="button"
                onClick={() => { onClose(); onNavigateAdmin() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                Admin Console
              </button>
            )}
            <div className="h-px bg-border my-1" />
            <button
              type="button"
              onClick={() => { onClose(); onLogout() }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-destructive transition hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground/50 font-mono">v1.0.0 beta</p>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sitter', label: 'Sitters' },
  { value: 'breather', label: 'Breathers' },
]

export function CalendarToolbar({
  displayTimezone,
  onTimezoneChange,
  onAddSitter,
  onAddBreather,
  user,
  onLogin,
  onLogout,
  isAdmin,
  capabilities,
  onNavigateAdmin,
  onNavigateDocs,
  onNavigateInstall,
  onNavigateSettings,
  userId,
  roleFilter,
  onRoleFilterChange,
  mineFilter,
  onMineFilterChange,
  onMyMatchesClick,
  myMatchesCount,
}: CalendarToolbarProps) {
  const showBreather = capabilities !== 'sitter'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* Top row: brand + controls */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-lg font-semibold tracking-tight text-foreground">
              Breath Group
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Timezone — desktop only */}
            <div className="hidden items-center gap-1.5 sm:flex">
              <GlobeAltIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <select
                value={displayTimezone}
                onChange={(e) => onTimezoneChange(e.target.value)}
                className="max-w-[10rem] cursor-pointer appearance-none rounded-md border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground outline-none transition hover:text-foreground focus:ring-1 focus:ring-ring"
                title="Display timezone"
              >
                {TIMEZONE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.zones.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Notification bell */}
            {user && userId && <NotificationBell userId={userId} />}

            {/* My Matches — top row, left of + New */}
            {user && onMyMatchesClick && (
              <button
                type="button"
                onClick={onMyMatchesClick}
                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent/20 hover:border-accent/60"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">My Matches</span>
                {typeof myMatchesCount === 'number' && myMatchesCount > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                    {myMatchesCount}
                  </span>
                )}
              </button>
            )}

            {/* Create dropdown */}
            {user && (
              <CreateDropdown
                onAddSitter={onAddSitter}
                onAddBreather={onAddBreather}
                showBreather={showBreather}
              />
            )}

            {/* Desktop auth */}
            <div className="hidden md:flex md:items-center">
              {user ? (
                <Menu as="div" className="relative">
                  <MenuButton className="flex items-center rounded-full transition hover:opacity-90 focus:outline-none">
                    <span className="sr-only">Open account menu</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
                      <UserCircle2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-border bg-background shadow-lg z-[200] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in"
                  >
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Signed in
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {user.displayName || user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="p-1.5">
                      {onNavigateDocs && (
                        <MenuItem>
                          <button
                            type="button"
                            onClick={onNavigateDocs}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground data-[focus]:bg-muted"
                          >
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            Documentation
                          </button>
                        </MenuItem>
                      )}
                      {onNavigateInstall && (
                        <MenuItem>
                          <button
                            type="button"
                            onClick={onNavigateInstall}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground data-[focus]:bg-muted"
                          >
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            Install App
                          </button>
                        </MenuItem>
                      )}
                      {onNavigateSettings && (
                        <MenuItem>
                          <button
                            type="button"
                            onClick={onNavigateSettings}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground data-[focus]:bg-muted"
                          >
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            Settings
                          </button>
                        </MenuItem>
                      )}
                      {isAdmin && onNavigateAdmin && (
                        <MenuItem>
                          <button
                            type="button"
                            onClick={onNavigateAdmin}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground data-[focus]:bg-muted"
                          >
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            Admin Console
                          </button>
                        </MenuItem>
                      )}
                      <div className="h-px bg-border mx-1.5 my-1" />
                      <MenuItem>
                        <button
                          type="button"
                          onClick={onLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground data-[focus]:bg-muted"
                        >
                          <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          Sign out
                        </button>
                      </MenuItem>
                    </div>
                    <div className="border-t border-border px-4 py-2">
                      <p className="text-[10px] text-muted-foreground/50 font-mono">v1.0.0 beta</p>
                    </div>
                  </MenuItems>
                </Menu>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign in
                </button>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
            >
              <span className="sr-only">Open menu</span>
              <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filter row — separated by a top border line */}
        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              {roleFilters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => onRoleFilterChange(f.value)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    roleFilter === f.value
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {user && (
              <MineFilterDropdown
                mineFilter={mineFilter}
                onMineFilterChange={onMineFilterChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile full-screen user panel */}
      <MobileUserPanel
        user={user}
        onLogout={onLogout}
        onNavigateDocs={onNavigateDocs}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateInstall={onNavigateInstall}
        onNavigateSettings={onNavigateSettings}
        isAdmin={isAdmin}
        displayTimezone={displayTimezone}
        onTimezoneChange={onTimezoneChange}
        onLogin={onLogin}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  )
}
