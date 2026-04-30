/**
 * useTheme — manages light / dark / system theme preference.
 * - Persists choice in localStorage under key 'theme'
 * - Defaults to 'light' (not system) for every new visitor
 * - Applies/removes the .dark class on <html> immediately
 */
import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'light'

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && getSystemDark())
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {}
    return DEFAULT_THEME
  })

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Keep in sync when system preference changes (only relevant for 'system' mode)
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}

/**
 * Call once at app startup (before React renders) to avoid flash of wrong theme.
 * Reads from localStorage, falls back to DEFAULT_THEME ('light').
 */
export function initTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const theme: Theme = (stored === 'light' || stored === 'dark' || stored === 'system')
      ? stored
      : DEFAULT_THEME
    // Persist the default for first-time visitors so they're always on light
    // unless they explicitly change it. This ensures existing users without a
    // saved preference get light — not whatever their OS is set to.
    if (!stored) localStorage.setItem(STORAGE_KEY, DEFAULT_THEME)
    applyTheme(theme)
  } catch {
    // no localStorage — stay light
  }
}
