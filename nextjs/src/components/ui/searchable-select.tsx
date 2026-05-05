'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Välj…', disabled, className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm transition-all outline-none text-left',
          'hover:border-zinc-300 hover:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:bg-white',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100',
          'dark:hover:border-zinc-600 dark:hover:bg-zinc-800',
          open && 'border-zinc-500 ring-2 ring-zinc-500/20 bg-white dark:border-zinc-400 dark:bg-zinc-900',
        )}
      >
        <span className={cn(!selectedLabel && 'text-zinc-400')}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-zinc-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-[800] mt-1.5 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök…"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-400">Inga resultat</div>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left cursor-pointer select-none',
                    'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900',
                    'dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
                    value === option.value && 'font-medium text-zinc-900 dark:text-white',
                  )}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="h-3.5 w-3.5 text-zinc-600 shrink-0 dark:text-zinc-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
