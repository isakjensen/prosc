'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'meeting' | 'task' | 'outreach' | 'invoice'
  color: string
  href?: string
  sub?: string
}

const typeLabel: Record<string, string> = {
  meeting: 'Möte',
  task: 'Uppgift',
  outreach: 'Outreach',
  invoice: 'Faktura',
}

const dayNames = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const monthNames = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
]

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday = 0
  const totalDays = lastDay.getDate()

  function getEventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e) => e.date.startsWith(dateStr))
  }

  const today = new Date()
  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Idag
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Möten</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Uppgifter</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-brown" /> Outreach</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Fakturor</span>
      </div>

      {/* Calendar grid */}
      <div className="panel-surface overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayNames.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEvents = day ? getEventsForDay(day) : []
            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-gray-50 p-1.5 ${
                  day === null ? 'bg-gray-50/50' : ''
                }`}
              >
                {day !== null && (
                  <>
                    <div
                      className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(day)
                          ? 'bg-zinc-800 text-white'
                          : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const inner = (
                          <div
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight truncate ${ev.color} bg-opacity-10`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${ev.color} shrink-0`} />
                            <span className="truncate text-gray-700">{ev.title}</span>
                          </div>
                        )
                        return ev.href ? (
                          <Link key={ev.id} href={ev.href} className="block hover:opacity-80">
                            {inner}
                          </Link>
                        ) : (
                          <div key={ev.id}>{inner}</div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-gray-400 pl-1">
                          +{dayEvents.length - 3} till
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
