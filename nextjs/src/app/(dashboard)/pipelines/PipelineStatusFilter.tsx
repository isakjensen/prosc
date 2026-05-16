'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ALL_STATUSES = ['RUNNING', 'IDLE', 'COMPLETED', 'STOPPED'] as const
type Status = (typeof ALL_STATUSES)[number]

const LABELS: Record<Status, string> = {
  RUNNING: 'Pågående',
  IDLE: 'Ej startad',
  COMPLETED: 'Klara',
  STOPPED: 'Stoppade',
}

const DOT_COLORS: Record<Status, string> = {
  RUNNING: 'bg-green-500',
  IDLE: 'bg-gray-400 dark:bg-zinc-500',
  COMPLETED: 'bg-brand-green',
  STOPPED: 'bg-red-400',
}

export const DEFAULT_VISIBLE: Status[] = ['RUNNING', 'IDLE']

interface Props {
  counts: Record<string, number>
  visibleStatuses: string[]
}

export default function PipelineStatusFilter({ counts, visibleStatuses }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function toggle(status: Status) {
    const current = new Set(visibleStatuses)
    if (current.has(status)) {
      if (current.size === 1) return
      current.delete(status)
    } else {
      current.add(status)
    }

    router.push(`${pathname}?show=${[...current].join(',')}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap gap-2 mt-5">
      {ALL_STATUSES.map((status) => {
        const active = visibleStatuses.includes(status)
        const count = counts[status] ?? 0

        return (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
              active
                ? 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-sm'
                : 'border-dashed border-gray-200 dark:border-zinc-700 bg-transparent text-gray-400 dark:text-zinc-600 opacity-60',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_COLORS[status])} />
            {LABELS[status]}
            {count > 0 && (
              <span
                className={cn(
                  'tabular-nums',
                  active ? 'text-gray-500 dark:text-zinc-400' : 'text-gray-300 dark:text-zinc-600',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
