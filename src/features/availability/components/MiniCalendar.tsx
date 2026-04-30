import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiniCalendarProps {
  month: Date
  selectedDate: string
  datesWithEntries: Set<string>
  onSelectDate: (date: string) => void
  onMonthChange: (month: Date) => void
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function MiniCalendar({
  month,
  selectedDate,
  datesWithEntries,
  onSelectDate,
  onMonthChange,
}: MiniCalendarProps) {
  const selectedDateValue = new Date(`${selectedDate}T00:00:00`)
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  return (
    <div className="w-full rounded-md border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(month, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {format(month, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const dateKey = format(day, 'yyyy-MM-dd')
          const selected = isSameDay(day, selectedDateValue)
          const today = isToday(day)
          const hasEntries = datesWithEntries.has(dateKey)

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                'relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-md text-xs transition',
                !inMonth && 'text-muted-foreground/30',
                inMonth && !selected && !today && 'text-foreground hover:bg-muted',
                today && !selected && 'font-semibold text-primary',
                selected && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              <span>{format(day, 'd')}</span>
              {hasEntries && (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    selected ? 'bg-primary-foreground/80' : 'bg-primary'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
