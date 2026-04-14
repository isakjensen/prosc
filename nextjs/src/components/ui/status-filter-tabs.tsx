'use client'

import Link from 'next/link'
import ScrollTabs from '@/components/ui/scroll-tabs'

interface StatusOption {
  value: string
  label: string
}

interface StatusFilterTabsProps {
  options: StatusOption[]
  activeValue: string | undefined
  basePath: string
}

export function StatusFilterTabs({ options, activeValue, basePath }: StatusFilterTabsProps) {
  return (
    <ScrollTabs>
      {options.map((opt) => {
        const href = opt.value ? `${basePath}?status=${opt.value}` : basePath
        const isActive = opt.value === '' ? !activeValue : activeValue === opt.value
        return (
          <Link
            key={opt.value}
            href={href}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              isActive
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {opt.label}
          </Link>
        )
      })}
    </ScrollTabs>
  )
}
