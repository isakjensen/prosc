'use client'

import { LayoutGrid, List } from 'lucide-react'

interface Props {
  view: 'board' | 'list'
  onChange: (view: 'board' | 'list') => void
}

export default function ProspektViewToggle({ view, onChange }: Props) {
  const base =
    'inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors'
  const active = 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
  const inactive =
    'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => onChange('board')}
        className={`${base} ${view === 'board' ? active : inactive}`}
        title="Boardvy"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`${base} ${view === 'list' ? active : inactive}`}
        title="Listvy"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  )
}
