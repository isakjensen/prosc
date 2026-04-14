'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import BulkPlanningModal from './BulkPlanningModal'

type OutreachType = 'EMAIL' | 'PHONE' | 'SMS' | 'PHYSICAL'
type OutreachStatus = 'PLANNED' | 'COMPLETED'

interface OutreachItem {
  id: string
  title: string
  type: OutreachType
  status: OutreachStatus
  scheduledAt: string
  customerId: string
  customerName: string
  customerCity: string | null
  customerIndustry: string | null
  userName: string | null
  createdAt: string
}

interface Prospect {
  id: string
  name: string
  city: string | null
  industry: string | null
  email: string | null
  phone: string | null
}

interface Props {
  outreaches: OutreachItem[]
  prospects: Prospect[]
  filters: {
    q?: string
    type?: string
    status?: string
    from?: string
    to?: string
  }
}

const typeLabels: Record<OutreachType, string> = {
  EMAIL: 'E-post',
  PHONE: 'Samtal',
  SMS: 'SMS',
  PHYSICAL: 'Fysisk kontakt',
}

const typeIcons: Record<OutreachType, typeof Mail> = {
  EMAIL: Mail,
  PHONE: Phone,
  SMS: MessageSquare,
  PHYSICAL: Users,
}

const typeAccents: Record<OutreachType, string> = {
  EMAIL: 'bg-blue-100 text-blue-800 ring-blue-200/80',
  PHONE: 'bg-amber-100 text-amber-800 ring-amber-200/80',
  SMS: 'bg-violet-100 text-violet-800 ring-violet-200/80',
  PHYSICAL: 'bg-emerald-100 text-emerald-800 ring-emerald-200/80',
}

const typeFilterColors: Record<OutreachType, { active: string; inactive: string }> = {
  EMAIL: { active: 'bg-blue-100 text-blue-800 border-blue-300', inactive: 'bg-white text-zinc-500 border-zinc-200 hover:border-blue-200 hover:text-blue-700' },
  PHONE: { active: 'bg-amber-100 text-amber-800 border-amber-300', inactive: 'bg-white text-zinc-500 border-zinc-200 hover:border-amber-200 hover:text-amber-700' },
  SMS: { active: 'bg-violet-100 text-violet-800 border-violet-300', inactive: 'bg-white text-zinc-500 border-zinc-200 hover:border-violet-200 hover:text-violet-700' },
  PHYSICAL: { active: 'bg-emerald-100 text-emerald-800 border-emerald-300', inactive: 'bg-white text-zinc-500 border-zinc-200 hover:border-emerald-200 hover:text-emerald-700' },
}

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function dateKey(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function OutreachPlanningView({ outreaches, prospects, filters }: Props) {
  const router = useRouter()
  const [bulkOpen, setBulkOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(filters.q ?? '')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const now = new Date()

  // Group outreaches by day
  const grouped = useMemo(() => {
    const map = new Map<string, OutreachItem[]>()
    for (const item of outreaches) {
      const key = dateKey(item.scheduledAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries()).map(([key, items]) => ({ dateKey: key, items }))
  }, [outreaches])

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { ...filters, ...overrides }
    if (merged.q) params.set('q', merged.q)
    if (merged.type) params.set('type', merged.type)
    if (merged.status) params.set('status', merged.status)
    if (merged.from) params.set('from', merged.from)
    if (merged.to) params.set('to', merged.to)
    const qs = params.toString()
    return `/outreach-planning${qs ? `?${qs}` : ''}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildUrl({ q: searchValue || undefined }))
  }

  function clearSearch() {
    setSearchValue('')
    router.push(buildUrl({ q: undefined }))
  }

  function toggleType(t: OutreachType) {
    router.push(buildUrl({ type: filters.type === t ? undefined : t }))
  }

  function toggleStatus(s: OutreachStatus) {
    router.push(buildUrl({ status: filters.status === s ? undefined : s }))
  }

  async function toggleItemStatus(item: OutreachItem) {
    const newStatus: OutreachStatus = item.status === 'PLANNED' ? 'COMPLETED' : 'PLANNED'
    setTogglingId(item.id)
    try {
      const res = await fetch(`/api/outreach/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success(newStatus === 'COMPLETED' ? 'Markerad som genomförd' : 'Markerad som planerad')
      router.refresh()
    } catch {
      toast.error('Kunde inte uppdatera status')
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Ta bort den här outreachen?')) return
    try {
      const res = await fetch(`/api/outreach/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Outreach borttagen')
      router.refresh()
    } catch {
      toast.error('Kunde inte ta bort outreach')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="CRM"
        title="Outreach-plan"
        description={`${outreaches.length} utskick`}
        action={
          <Button onClick={() => setBulkOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Planera outreach</span>
            <span className="sm:hidden">Planera</span>
          </Button>
        }
      />

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Sök på kundnamn eller titel..."
              className="h-10 pl-10 pr-9"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="outline" className="h-10 shrink-0">
            Sök
          </Button>
        </form>

        {/* Type + Status filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <button
            onClick={() => toggleStatus('PLANNED')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filters.status === 'PLANNED'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-white text-zinc-500 border-zinc-200 hover:border-blue-200 hover:text-blue-700',
            )}
          >
            Planerade
          </button>
          <button
            onClick={() => toggleStatus('COMPLETED')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filters.status === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white text-zinc-500 border-zinc-200 hover:border-emerald-200 hover:text-emerald-700',
            )}
          >
            Genomförda
          </button>

          <span className="text-zinc-300">|</span>

          {/* Type pills */}
          {(Object.keys(typeLabels) as OutreachType[]).map((t) => {
            const Icon = typeIcons[t]
            const colors = typeFilterColors[t]
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filters.type === t ? colors.active : colors.inactive,
                )}
              >
                <Icon className="h-3 w-3" />
                {typeLabels[t]}
              </button>
            )
          })}
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-zinc-500 shrink-0">Från:</label>
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => router.push(buildUrl({ from: e.target.value || undefined }))}
            className="h-9 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
          />
          <label className="text-xs font-medium text-zinc-500 shrink-0">Till:</label>
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => router.push(buildUrl({ to: e.target.value || undefined }))}
            className="h-9 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
          />
          {(filters.from || filters.to) && (
            <button
              onClick={() => router.push(buildUrl({ from: undefined, to: undefined }))}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline"
            >
              Rensa datum
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {outreaches.length === 0 ? (
        <div className="panel-surface text-center py-16">
          <Calendar className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Inga outreach hittades</p>
          <p className="text-xs text-zinc-400 mt-1">
            Ändra filter eller planera nya outreach.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ dateKey: dk, items }) => {
            const today = isToday(items[0].scheduledAt)
            return (
              <div key={dk}>
                {/* Day header */}
                <div className={cn(
                  'flex items-center gap-3 mb-3 px-1',
                  today && 'text-blue-700',
                )}>
                  <h3 className="text-sm font-semibold capitalize">
                    {today ? 'Idag' : formatDayHeader(items[0].scheduledAt)}
                  </h3>
                  {today && (
                    <span className="text-xs font-medium capitalize text-zinc-400">
                      {formatDayHeader(items[0].scheduledAt)}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                {/* Desktop table */}
                <div className="panel-surface hidden md:block overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 w-10"></th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Kund</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Titel</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Typ</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {items.map((item) => {
                        const Icon = typeIcons[item.type]
                        const isPast = new Date(item.scheduledAt) < now && item.status === 'PLANNED'
                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              'group transition-colors',
                              isPast
                                ? 'bg-amber-50/40 hover:bg-amber-50/60'
                                : 'hover:bg-zinc-50/60',
                              item.status === 'COMPLETED' && 'opacity-60',
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white',
                                typeAccents[item.type],
                              )}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/customers/${item.customerId}`}
                                className="font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
                              >
                                {item.customerName}
                              </Link>
                              {item.customerCity && (
                                <p className="text-xs text-zinc-400">{item.customerCity}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {item.title}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={item.type === 'EMAIL' ? 'info' : item.type === 'PHONE' ? 'warning' : 'default'}>
                                {typeLabels[item.type]}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {item.status === 'COMPLETED' ? (
                                <Badge variant="success">Genomförd</Badge>
                              ) : isPast ? (
                                <Badge variant="warning">Försenad</Badge>
                              ) : (
                                <Badge variant="info">Planerad</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => toggleItemStatus(item)}
                                  disabled={togglingId === item.id}
                                  title={item.status === 'PLANNED' ? 'Markera genomförd' : 'Markera planerad'}
                                >
                                  {togglingId === item.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className={cn('h-3.5 w-3.5', item.status === 'COMPLETED' ? 'text-zinc-400' : 'text-emerald-600')} />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteItem(item.id)}
                                  title="Ta bort"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {items.map((item) => {
                    const Icon = typeIcons[item.type]
                    const isPast = new Date(item.scheduledAt) < now && item.status === 'PLANNED'
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'panel-surface p-4 flex items-start gap-3',
                          isPast && 'border-amber-200 bg-amber-50/30',
                          item.status === 'COMPLETED' && 'opacity-60',
                        )}
                      >
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ring-white',
                          typeAccents[item.type],
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={`/customers/${item.customerId}`}
                                className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
                              >
                                {item.customerName}
                              </Link>
                              <p className={cn(
                                'text-sm text-zinc-600 mt-0.5',
                                item.status === 'COMPLETED' && 'line-through',
                              )}>
                                {item.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge variant={item.type === 'EMAIL' ? 'info' : item.type === 'PHONE' ? 'warning' : 'default'}>
                                  {typeLabels[item.type]}
                                </Badge>
                                {item.status === 'COMPLETED' ? (
                                  <Badge variant="success">Genomförd</Badge>
                                ) : isPast ? (
                                  <Badge variant="warning">Försenad</Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => toggleItemStatus(item)}
                                disabled={togglingId === item.id}
                              >
                                {togglingId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className={cn('h-3.5 w-3.5', item.status === 'COMPLETED' ? 'text-zinc-400' : 'text-emerald-600')} />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BulkPlanningModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onCreated={() => {
          setBulkOpen(false)
          router.refresh()
        }}
        prospects={prospects}
      />
    </div>
  )
}
