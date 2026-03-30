'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

interface DatePickerProps {
  value?: Date | null
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Välj datum', disabled, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const today = new Date()
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1)

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const handleSelect = (day: number) => {
    onChange(new Date(viewYear, viewMonth, day))
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  const formattedValue = value
    ? `${value.getDate()} ${MONTHS[value.getMonth()]?.toLowerCase()} ${value.getFullYear()}`
    : null

  // Build calendar grid
  const cells: { day: number; currentMonth: boolean }[] = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: prevMonthDays - firstDay + 1 + i, currentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, currentMonth: false })
    }
  }

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (disabled) return
        setIsOpen(open)
        if (open) {
          setViewYear(value?.getFullYear() ?? today.getFullYear())
          setViewMonth(value?.getMonth() ?? today.getMonth())
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'group flex w-full items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-sm transition-all outline-none',
            'hover:border-zinc-300 hover:bg-white focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 focus:bg-white',
            'dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:border-zinc-400 dark:focus:bg-zinc-900',
            'data-[state=open]:border-zinc-500 data-[state=open]:ring-2 data-[state=open]:ring-zinc-500/20 data-[state=open]:bg-white dark:data-[state=open]:border-zinc-400 dark:data-[state=open]:bg-zinc-900',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500" />
          <span className={cn('flex-1 truncate', formattedValue ? 'text-gray-900 dark:text-zinc-100' : 'text-gray-400 dark:text-zinc-500')}>
            {formattedValue ?? placeholder}
          </span>
          {value && (
            <span
              onClick={handleClear}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={16}
          className="z-[800] w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-zinc-700 dark:bg-zinc-900"
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((cell, i) => {
              const isCurrentMonth = cell.currentMonth
              const isToday = isCurrentMonth && isSameDay(new Date(viewYear, viewMonth, cell.day), today)
              const isSelected = isCurrentMonth && !!value && isSameDay(new Date(viewYear, viewMonth, cell.day), value)

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!isCurrentMonth}
                  onClick={() => isCurrentMonth && handleSelect(cell.day)}
                  className={cn(
                    'flex h-9 w-full items-center justify-center rounded-lg text-sm transition-all',
                    !isCurrentMonth && 'text-gray-300 dark:text-zinc-700 cursor-default',
                    isCurrentMonth && !isSelected && !isToday && 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                    isToday && !isSelected && 'font-bold text-zinc-900 bg-zinc-100 dark:text-zinc-100 dark:bg-zinc-800',
                    isSelected && 'bg-zinc-800 text-white font-semibold dark:bg-zinc-200 dark:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-300',
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { onChange(today); setIsOpen(false) }}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Idag
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(undefined); setIsOpen(false) }}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                Rensa
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
