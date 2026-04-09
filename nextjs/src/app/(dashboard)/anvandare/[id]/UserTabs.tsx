'use client'

import Link from 'next/link'
import ScrollTabs from '@/components/ui/scroll-tabs'

interface Tab {
  key: string
  label: string
}

interface Props {
  tabs: Tab[]
  activeTab: string
  userId: string
}

export default function UserTabs({ tabs, activeTab, userId }: Props) {
  return (
    <ScrollTabs>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/anvandare/${userId}?tab=${t.key}`}
          className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === t.key
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
              : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </ScrollTabs>
  )
}
