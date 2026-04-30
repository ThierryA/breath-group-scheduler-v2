import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CalendarPlus, CalendarDays, Download, Mail } from 'lucide-react'
import type { AvailabilityEntry } from '@/features/availability/api'
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  yahooCalendarUrl,
  downloadICS,
} from '@/features/availability/utils/calendarLinks'
import { cn } from '@/lib/utils'

const PROVIDERS = [
  { id: 'google', label: 'Google Calendar', icon: CalendarDays },
  { id: 'outlook', label: 'Outlook', icon: Mail },
  { id: 'yahoo', label: 'Yahoo Calendar', icon: CalendarDays },
  { id: 'ics', label: 'Download .ics', icon: Download },
] as const

interface AddToCalendarButtonProps {
  entry: AvailabilityEntry
  /** Compact mode for mobile cards */
  compact?: boolean
}

interface DropdownPos {
  top: number
  left: number
  width: number
  openUp: boolean
}

export function AddToCalendarButton({ entry, compact }: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Compute fixed position from the trigger button
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownH = 160 // approx height of 4 items
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < dropdownH + 8
    setPos({
      top: openUp ? rect.top - dropdownH - 4 : rect.bottom + 4,
      left: rect.left,
      width: 192, // w-48
      openUp,
    })
  }, [])

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open) calcPos()
    setOpen((v) => !v)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on scroll/resize (reposition would be complex — just close)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function openUrl(url: string) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleSelect(providerId: string) {
    setOpen(false)
    switch (providerId) {
      case 'google':  openUrl(googleCalendarUrl(entry)); break
      case 'outlook': openUrl(outlookCalendarUrl(entry)); break
      case 'yahoo':   openUrl(yahooCalendarUrl(entry)); break
      case 'ics':     downloadICS(entry); break
    }
  }

  const dropdown = open && pos ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-background shadow-xl',
        'animate-in fade-in-0 zoom-in-95 duration-100',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="py-1">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon
          return (
            <li key={provider.id}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSelect(provider.id) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {provider.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        title="Add to calendar"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border text-muted-foreground transition',
          'hover:bg-primary/5 hover:text-primary active:scale-95',
          compact
            ? 'mt-2 w-full justify-center px-2 py-1.5 text-[11px] font-medium'
            : 'px-2 py-1 text-xs font-medium'
        )}
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? 'Add to Cal' : 'Add to Calendar'}
      </button>
      {dropdown}
    </>
  )
}
