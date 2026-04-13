'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, UserCircle2, FileText, Banknote, Box, CheckSquare, LifeBuoy, X } from 'lucide-react'

interface SearchResult {
  type: 'customer' | 'contact' | 'quote' | 'invoice' | 'project' | 'task' | 'ticket'
  id: string
  label: string
  sub: string | null
  href: string
}

const typeConfig: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  customer: { label: 'Kund', icon: Building2, color: 'text-blue-600' },
  contact: { label: 'Kontakt', icon: UserCircle2, color: 'text-violet-600' },
  quote: { label: 'Offert', icon: FileText, color: 'text-amber-600' },
  invoice: { label: 'Faktura', icon: Banknote, color: 'text-green-600' },
  project: { label: 'Projekt', icon: Box, color: 'text-cyan-600' },
  task: { label: 'Uppgift', icon: CheckSquare, color: 'text-orange-600' },
  ticket: { label: 'Support', icon: LifeBuoy, color: 'text-rose-600' },
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  function search(q: string) {
    if (q.length < 2) {
      setResults([])
      return
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setSelectedIndex(0)
      } catch {
        setResults([])
      }
    }, 200)
  }

  function handleChange(value: string) {
    setQuery(value)
    search(value)
  }

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-400 text-sm hover:bg-white hover:border-gray-300 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-500"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Sök...</span>
        <kbd className="ml-2 text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-400 dark:bg-zinc-700 dark:border-zinc-600">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] overflow-y-auto">
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex justify-center pt-[15vh]">
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
              <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-zinc-800">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Sök kunder, offerter, fakturor, projekt..."
                  className="flex-1 h-12 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                />
                <button onClick={() => setOpen(false)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {results.length > 0 && (
                <div className="max-h-80 overflow-y-auto py-2">
                  {results.map((r, i) => {
                    const config = typeConfig[r.type]
                    const Icon = config?.icon ?? Building2
                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => navigate(r.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          i === selectedIndex
                            ? 'bg-gray-50 dark:bg-zinc-800'
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${config?.color ?? 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{r.label}</p>
                          {r.sub && <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{r.sub}</p>}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400 shrink-0">
                          {config?.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {query.length >= 2 && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Inga resultat för &quot;{query}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
