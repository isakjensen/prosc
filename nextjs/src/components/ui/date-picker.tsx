'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, getDay } from 'date-fns'
import { sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: Date | null
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Välj datum', disabled, className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value ?? new Date())

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Adjust so week starts on Monday (0=Mon ... 6=Sun)
  const startPad = (getDay(monthStart) + 6) % 7

  const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all hover:bg-gray-50 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 text-left',
            !value && 'text-gray-400',
            value && 'text-gray-900',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="flex-1">
            {value ? format(value, 'd MMM yyyy', { locale: sv }) : placeholder}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[800] w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-4 animate-in fade-in-0 zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 capitalize">
              {format(viewDate, 'MMMM yyyy', { locale: sv })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const selected = value ? isSameDay(day, value) : false
              const today = isToday(day)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(day)
                    setOpen(false)
                  }}
                  className={cn(
                    'h-8 w-full rounded-md text-sm transition-colors',
                    selected && 'bg-zinc-800 text-white font-semibold',
                    !selected && today && 'bg-zinc-100 font-bold text-zinc-900',
                    !selected && !today && 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {value && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { onChange(undefined); setOpen(false) }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Rensa val
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
