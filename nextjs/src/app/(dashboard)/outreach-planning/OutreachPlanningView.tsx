'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  CheckCircle2,
  Copy,
  Eye,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useConfirm } from '@/components/confirm/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { cn, formatDate } from '@/lib/utils'
import { toast } from '@/lib/toast'
import BulkPlanningModal from './BulkPlanningModal'
import EmailComposer from '@/components/email/EmailComposer'
import EmailStatusBadge from '@/components/email/EmailStatusBadge'
import type { VariableData } from '@/lib/email-variables'

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
  customerOrgNumber: string | null
  customerEmail: string | null
  userName: string | null
  emailStatus: string | null
  subject: string | null
  body: string | null
  recipients: string | null
  attachments: string | null
  sendAt: string | null
  createdAt: string
}

function parseRecipients(raw: string | null): string[] {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function parseAttachments(raw: string | null): string[] {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
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
  PHONE: "bg-brand-beige text-brand-brown ring-brand-brown/20",
  SMS: "bg-brand-gray text-brand-brown ring-brand-brown/15",
  PHYSICAL: "bg-brand-green/15 text-brand-green ring-brand-green/30",
}

const typeFilterColors: Record<OutreachType, { active: string; inactive: string }> = {
  EMAIL: { active: 'bg-blue-100 text-blue-800 border-blue-300', inactive: 'bg-white text-zinc-500 border-zinc-200 hover:border-blue-200 hover:text-blue-700' },
  PHONE: { active: "bg-brand-beige text-brand-brown border-brand-brown/35", inactive: "bg-white text-zinc-500 border-zinc-200 hover:border-brand-brown/25 hover:text-brand-brown" },
  SMS: { active: "bg-brand-gray text-brand-brown border-brand-brown/25", inactive: "bg-white text-zinc-500 border-zinc-200 hover:border-brand-brown/20 hover:text-brand-brown" },
  PHYSICAL: { active: "bg-brand-green/15 text-brand-green border-brand-green/40", inactive: "bg-white text-zinc-500 border-zinc-200 hover:border-brand-green/30 hover:text-brand-green" },
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
  const confirm = useConfirm()
  const router = useRouter()
  const [bulkOpen, setBulkOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(filters.q ?? '')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Edit modal state
  const [editItem, setEditItem] = useState<OutreachItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState<OutreachType>('EMAIL')
  const [editDate, setEditDate] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editRecipients, setEditRecipients] = useState('')
  const [editSendAt, setEditSendAt] = useState('')
  const [editSendMode, setEditSendMode] = useState<'now' | 'scheduled'>('now')
  const [editTemplateId, setEditTemplateId] = useState('')
  const [editAttachments, setEditAttachments] = useState<string[]>([])
  const [editContactEmails, setEditContactEmails] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Detail modal
  const [detailItem, setDetailItem] = useState<OutreachItem | null>(null)

  const now = new Date()

  // Count active filters
  const activeFilterCount = [filters.q, filters.type, filters.status, filters.from, filters.to].filter(Boolean).length

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

  function clearAllFilters() {
    setSearchValue('')
    router.push('/outreach-planning')
    setFilterOpen(false)
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

  async function handleSendEmail(id: string) {
    setSendingId(id)
    try {
      console.log(`[UI] Sending outreach ${id}...`)
      const res = await fetch(`/api/outreach/${id}/send`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      console.log(`[UI] Response:`, res.status, data)
      if (!res.ok) {
        throw new Error(data.error || 'Kunde inte skicka')
      }
      toast.success(data.scheduled ? 'E-post schemalagd!' : 'E-post skickad!')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte skicka e-post'
      console.error(`[UI] Send failed:`, msg)
      toast.error(msg)
    } finally {
      setSendingId(null)
    }
  }

  async function deleteItem(id: string) {
    const ok = await confirm({
      title: 'Ta bort outreach?',
      description: 'Ta bort den här outreachen? Detta går inte att ångra.',
      variant: 'danger',
      confirmLabel: 'Ta bort',
      cancelLabel: 'Avbryt',
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/outreach/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Outreach borttagen')
      router.refresh()
    } catch {
      toast.error('Kunde inte ta bort outreach')
    }
  }

  function toDateValue(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  async function openEdit(item: OutreachItem) {
    setEditTitle(item.title)
    setEditType(item.type)
    setEditDate(toDateValue(new Date(item.scheduledAt)))
    setEditBody(item.body ?? '')
    setEditSubject(item.subject ?? '')
    setEditRecipients(parseRecipients(item.recipients).join(', '))
    setEditAttachments(parseAttachments(item.attachments))
    setEditSendAt(item.sendAt ?? '')
    setEditSendMode(item.sendAt ? 'scheduled' : 'now')
    setEditTemplateId('')
    setEditContactEmails([])
    setEditItem(item)

    if (item.type === 'EMAIL') {
      try {
        const res = await fetch(`/api/contacts?customerId=${encodeURIComponent(item.customerId)}`)
        if (res.ok) {
          const contacts = await res.json()
          const emails = (Array.isArray(contacts) ? contacts : [])
            .map((c: { email: string | null }) => c.email)
            .filter((e: string | null): e is string => Boolean(e))
          setEditContactEmails(emails)
        }
      } catch {
        // Silent — contactEmails is optional
      }
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem || !editTitle.trim() || !editDate) return
    setSaving(true)
    try {
      const recipients = editRecipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        type: editType,
        scheduledAt: new Date(editDate).toISOString(),
        body: editBody.trim() || null,
        recipients: recipients.length > 0 ? recipients : null,
        attachments: editAttachments.length > 0 ? editAttachments : null,
      }
      if (editType === 'EMAIL') {
        payload.subject = editSubject || null
        payload.sendAt = editSendMode === 'scheduled' && editSendAt
          ? new Date(editSendAt).toISOString()
          : null
      }
      const res = await fetch(`/api/outreach/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setEditItem(null)
      toast.success('Outreach uppdaterad')
      router.refresh()
    } catch {
      toast.error('Kunde inte uppdatera outreach')
    } finally {
      setSaving(false)
    }
  }

  function copyBody(item: OutreachItem) {
    const parts: string[] = []
    parts.push(`Titel: ${item.title}`)
    parts.push(`Typ: ${typeLabels[item.type]}`)
    parts.push(`Datum: ${formatDate(item.scheduledAt)}`)
    if (item.subject) parts.push(`Ämne: ${item.subject}`)
    const recipients = parseRecipients(item.recipients)
    if (recipients.length > 0) parts.push(`Mottagare: ${recipients.join(', ')}`)
    if (item.body) parts.push(`\n${item.body}`)
    navigator.clipboard.writeText(parts.join('\n'))
    toast.success('Kopierat till urklipp')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const names = Array.from(files).map((f) => f.name)
    setEditAttachments((prev) => [...prev, ...names])
    e.target.value = ''
  }

  function removeAttachment(index: number) {
    setEditAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const editVariableData: VariableData | undefined = editItem
    ? {
        foretag: editItem.customerName ?? '',
        stad: editItem.customerCity ?? '',
        bransch: editItem.customerIndustry ?? '',
        orgnummer: editItem.customerOrgNumber ?? '',
      }
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="CRM"
        title="Outreach-plan"
        description={`${outreaches.length} utskick`}
        action={
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <Button
              variant="outline"
              onClick={() => setFilterOpen(true)}
              className="relative gap-2"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtrera</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 dark:bg-zinc-100 text-[10px] font-semibold text-white dark:text-zinc-900">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button onClick={() => setBulkOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Planera outreach</span>
              <span className="sm:hidden">Planera</span>
            </Button>
          </div>
        }
      />

      {/* Active filter badges (shown inline when filters are active) */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.q && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Sök: &quot;{filters.q}&quot;
              <button onClick={() => { setSearchValue(''); router.push(buildUrl({ q: undefined })) }} className="text-zinc-400 hover:text-zinc-600"><X className="h-3 w-3" /></button>
            </span>
          )}
          {filters.type && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Typ: {typeLabels[filters.type as OutreachType]}
              <button onClick={() => router.push(buildUrl({ type: undefined }))} className="text-zinc-400 hover:text-zinc-600"><X className="h-3 w-3" /></button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {filters.status === 'PLANNED' ? 'Planerade' : 'Genomförda'}
              <button onClick={() => router.push(buildUrl({ status: undefined }))} className="text-zinc-400 hover:text-zinc-600"><X className="h-3 w-3" /></button>
            </span>
          )}
          {(filters.from || filters.to) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {filters.from && filters.to ? `${filters.from} – ${filters.to}` : filters.from ? `Från ${filters.from}` : `Till ${filters.to}`}
              <button onClick={() => router.push(buildUrl({ from: undefined, to: undefined }))} className="text-zinc-400 hover:text-zinc-600"><X className="h-3 w-3" /></button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-zinc-400 hover:text-zinc-600 underline"
          >
            Rensa alla
          </button>
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filtrera outreach"
      >
        <div className="px-6 py-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Sök
            </label>
            <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); router.push(buildUrl({ q: searchValue || undefined })); setFilterOpen(false) }} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={searchValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
                  placeholder="Kundnamn eller titel..."
                  className="h-10 pl-10 pr-9"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => { setSearchValue(''); router.push(buildUrl({ q: undefined })) }}
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
          </div>

          {/* Status */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleStatus('PLANNED')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
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
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  filters.status === 'COMPLETED'
                    ? "bg-brand-green/15 text-brand-green border-brand-green/40"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-brand-green/30 hover:text-brand-green",
                )}
              >
                Genomförda
              </button>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Typ av outreach
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(typeLabels) as OutreachType[]).map((t) => {
                const Icon = typeIcons[t]
                const colors = typeFilterColors[t]
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      filters.type === t ? colors.active : colors.inactive,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {typeLabels[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Datumintervall
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Från</label>
                <input
                  type="date"
                  value={filters.from ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => router.push(buildUrl({ from: e.target.value || undefined }))}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Till</label>
                <input
                  type="date"
                  value={filters.to ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => router.push(buildUrl({ to: e.target.value || undefined }))}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                />
              </div>
            </div>
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

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40 px-6 py-4 flex items-center justify-between gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Rensa alla
            </button>
          )}
          <Button onClick={() => setFilterOpen(false)} className="ml-auto">
            Klar
          </Button>
        </div>
      </FilterDrawer>

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
                                ? "bg-brand-beige/50 hover:bg-brand-beige/70"
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
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="text-left hover:text-zinc-900 transition-colors"
                              >
                                {item.title}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={item.type === 'EMAIL' ? 'info' : item.type === 'PHONE' ? 'warning' : 'default'}>
                                {typeLabels[item.type]}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {item.status === 'COMPLETED' ? (
                                  <Badge variant="success">Genomförd</Badge>
                                ) : isPast ? (
                                  <Badge variant="warning">Försenad</Badge>
                                ) : (
                                  <Badge variant="info">Planerad</Badge>
                                )}
                                {item.type === 'EMAIL' && item.emailStatus && (
                                  <EmailStatusBadge status={item.emailStatus} />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.type === 'EMAIL' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-brand-brown hover:opacity-90 hover:bg-brand-gray/80"
                                    onClick={() => handleSendEmail(item.id)}
                                    disabled={sendingId === item.id}
                                    title="Skicka e-post"
                                  >
                                    {sendingId === item.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Send className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setDetailItem(item)}
                                  title="Visa detaljer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
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
                                    <CheckCircle2 className={cn('h-3.5 w-3.5', item.status === "COMPLETED" ? "text-zinc-400" : "text-brand-green")} />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => copyBody(item)}
                                  title="Kopiera innehåll"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEdit(item)}
                                  title="Redigera"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
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
                          isPast && "border-brand-brown/25 bg-brand-beige/35",
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
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className={cn(
                                  'text-sm text-zinc-600 mt-0.5 text-left hover:text-zinc-900 transition-colors',
                                  item.status === 'COMPLETED' && 'line-through',
                                )}
                              >
                                {item.title}
                              </button>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge variant={item.type === 'EMAIL' ? 'info' : item.type === 'PHONE' ? 'warning' : 'default'}>
                                  {typeLabels[item.type]}
                                </Badge>
                                {item.status === 'COMPLETED' ? (
                                  <Badge variant="success">Genomförd</Badge>
                                ) : isPast ? (
                                  <Badge variant="warning">Försenad</Badge>
                                ) : null}
                                {item.type === 'EMAIL' && item.emailStatus && (
                                  <EmailStatusBadge status={item.emailStatus} />
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              {item.type === 'EMAIL' && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-brand-brown hover:opacity-90 hover:bg-brand-gray/80"
                                  onClick={() => handleSendEmail(item.id)}
                                  disabled={sendingId === item.id}
                                  title="Skicka e-post"
                                >
                                  {sendingId === item.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
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
                                  <CheckCircle2 className={cn('h-3.5 w-3.5', item.status === "COMPLETED" ? "text-zinc-400" : "text-brand-green")} />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => copyBody(item)}
                                title="Kopiera innehåll"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
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

      {/* Edit modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Redigera outreach"
        description={editItem ? `${editItem.customerName}` : undefined}
        size="lg"
        panelClassName="sm:rounded-2xl shadow-zinc-950/20"
      >
        <form onSubmit={handleEdit}>
          <ModalBody className="space-y-5 pb-2 overflow-x-hidden">
            <div className="space-y-2">
              <label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Titel
              </label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                placeholder="T.ex. Uppföljning kring offert…"
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-type" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Typ
                </label>
                <Select
                  id="edit-type"
                  value={editType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditType(e.target.value as OutreachType)}
                  className="h-11"
                >
                  <option value="EMAIL">E-post</option>
                  <option value="PHONE">Samtal</option>
                  <option value="SMS">SMS</option>
                  <option value="PHYSICAL">Fysisk kontakt</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-date" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Planerat datum
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDate(e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>
              </div>
            </div>

            {editType === 'EMAIL' ? (
              <EmailComposer
                subject={editSubject}
                onSubjectChange={setEditSubject}
                body={editBody}
                onBodyChange={setEditBody}
                recipients={editRecipients}
                onRecipientsChange={setEditRecipients}
                sendAt={editSendAt}
                onSendAtChange={setEditSendAt}
                sendMode={editSendMode}
                onSendModeChange={setEditSendMode}
                variableData={editVariableData}
                templateId={editTemplateId}
                onTemplateChange={setEditTemplateId}
                contactEmails={editContactEmails}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label htmlFor="edit-recipients" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Mottagare
                    </label>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      Kommaseparerade
                    </span>
                  </div>
                  <Input
                    id="edit-recipients"
                    value={editRecipients}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditRecipients(e.target.value)}
                    placeholder="namn@foretag.se, anna@foretag.se"
                    className="h-11"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="edit-body" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Anteckningar
                    </label>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Valfritt</span>
                  </div>
                  <Textarea
                    id="edit-body"
                    value={editBody}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditBody(e.target.value)}
                    rows={6}
                    placeholder="Anteckningar inför kontakten…"
                    className="min-h-[140px] resize-y leading-relaxed"
                  />
                </div>
              </>
            )}

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Bilagor
                </label>
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Valfritt</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {editAttachments.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <label className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 cursor-pointer hover:border-zinc-400 hover:text-zinc-800">
                  <Plus className="h-3 w-3" />
                  Lägg till
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </ModalBody>

          {editItem && (
            <div className="px-6 py-2 bg-zinc-50 border-t border-zinc-100 text-[11px] font-mono text-zinc-400">
              DEBUG: type={editType} | emailStatus={editItem.emailStatus ?? 'null'} | showSend={String(editType === 'EMAIL')}
            </div>
          )}

          <ModalFooter className="gap-3 px-6 py-5">
            <Button type="button" variant="outline" onClick={() => setEditItem(null)} className="min-w-[5.5rem] rounded-lg border-zinc-200 bg-white">
              Avbryt
            </Button>
            <Button type="submit" disabled={saving || !editTitle.trim() || !editDate} className="min-w-[8rem] rounded-lg disabled:pointer-events-none disabled:opacity-45">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Spara
            </Button>
            {editItem && editType === 'EMAIL' && (
              <Button
                type="button"
                disabled={sendingId === editItem.id || saving || !editSubject.trim() || !editRecipients.trim()}
                className="min-w-[10rem] rounded-lg gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:pointer-events-none disabled:opacity-45"
                onClick={async () => {
                  if (!editItem) return
                  // Save first, then send
                  setSaving(true)
                  try {
                    const recipients = editRecipients.split(',').map((r) => r.trim()).filter(Boolean)
                    const payload: Record<string, unknown> = {
                      title: editTitle.trim(),
                      type: editType,
                      scheduledAt: new Date(editDate).toISOString(),
                      body: editBody.trim() || null,
                      recipients: recipients.length > 0 ? recipients : null,
                      attachments: editAttachments.length > 0 ? editAttachments : null,
                      subject: editSubject || null,
                      sendAt: editSendMode === 'scheduled' && editSendAt
                        ? new Date(editSendAt).toISOString()
                        : null,
                    }
                    const saveRes = await fetch(`/api/outreach/${editItem.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    })
                    if (!saveRes.ok) {
                      toast.error('Kunde inte spara outreach')
                      return
                    }
                  } catch {
                    toast.error('Kunde inte spara outreach')
                    return
                  } finally {
                    setSaving(false)
                  }
                  // Now send
                  setEditItem(null)
                  await handleSendEmail(editItem.id)
                }}
              >
                {sendingId === editItem.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {editSendMode === 'scheduled' ? 'Spara & schemalägg' : 'Spara & skicka'}
              </Button>
            )}
          </ModalFooter>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title ?? ''}
        description={detailItem?.customerName}
        size="lg"
        panelClassName="sm:rounded-2xl shadow-zinc-950/20"
      >
        {detailItem && (
          <>
            <ModalBody className="space-y-4 pb-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant={detailItem.status === 'COMPLETED' ? 'success' : 'info'}>
                  {detailItem.status === 'COMPLETED' ? 'Genomförd' : 'Planerad'}
                </Badge>
                <Badge variant="default">{typeLabels[detailItem.type]}</Badge>
                {detailItem.type === 'EMAIL' && detailItem.emailStatus && (
                  <EmailStatusBadge status={detailItem.emailStatus} />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Kund</span>
                  <Link
                    href={`/customers/${detailItem.customerId}`}
                    className="font-medium text-zinc-900 hover:text-zinc-600"
                  >
                    {detailItem.customerName}
                  </Link>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Planerat datum</span>
                  <span className="font-medium text-zinc-900">
                    {formatDate(detailItem.scheduledAt)}
                  </span>
                </div>
                {detailItem.sendAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Schemalagd sändning</span>
                    <span className="font-medium text-zinc-900">
                      {new Date(detailItem.sendAt).toLocaleString('sv-SE')}
                    </span>
                  </div>
                )}
                {detailItem.type === 'EMAIL' && detailItem.subject && (
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-zinc-500 shrink-0">Ämne</span>
                    <span className="font-medium text-zinc-900 text-right">
                      {detailItem.subject}
                    </span>
                  </div>
                )}
                {parseRecipients(detailItem.recipients).length > 0 && (
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-zinc-500 shrink-0">Mottagare</span>
                    <span className="font-medium text-zinc-900 text-right">
                      {parseRecipients(detailItem.recipients).join(', ')}
                    </span>
                  </div>
                )}
                {detailItem.userName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Skapad av</span>
                    <span className="font-medium text-zinc-900">{detailItem.userName}</span>
                  </div>
                )}
              </div>

              {detailItem.body && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {detailItem.type === 'EMAIL' ? 'Mejlinnehåll' : 'Anteckningar'}
                  </h4>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {detailItem.body}
                    </p>
                  </div>
                </div>
              )}

              {parseAttachments(detailItem.attachments).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Bilagor
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {parseAttachments(detailItem.attachments).map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="gap-3 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => copyBody(detailItem)}
                className="gap-2 rounded-lg"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopiera
              </Button>
              {detailItem.type === 'EMAIL' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendEmail(detailItem.id)}
                  disabled={sendingId === detailItem.id}
                  className="gap-2 rounded-lg text-brand-brown border-brand-brown/25 hover:bg-brand-gray/80"
                >
                  {sendingId === detailItem.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Skicka e-post
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  const item = detailItem
                  setDetailItem(null)
                  openEdit(item)
                }}
                className="gap-2 rounded-lg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Redigera
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

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
