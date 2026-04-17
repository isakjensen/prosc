'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Calendar,
  Check,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Users,
} from 'lucide-react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AVAILABLE_VARIABLES } from '@/lib/email-variables'

type OutreachType = 'EMAIL' | 'PHONE' | 'SMS' | 'PHYSICAL'

interface Prospect {
  id: string
  name: string
  city: string | null
  industry: string | null
  email: string | null
  phone: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  prospects: Prospect[]
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

function toDateValue(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatSwedishDate(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d)
}

interface DistributionDay {
  date: Date
  prospectIds: string[]
}

function distributeProspects(
  prospectIds: string[],
  startDate: Date,
  endDate: Date,
  perDay: number,
): DistributionDay[] {
  const days: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  if (days.length === 0) return []

  const result: DistributionDay[] = []
  let idx = 0

  for (const day of days) {
    if (idx >= prospectIds.length) break
    const chunk = prospectIds.slice(idx, idx + perDay)
    result.push({ date: day, prospectIds: chunk })
    idx += chunk.length
  }

  return result
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export default function BulkPlanningModal({ isOpen, onClose, onCreated, prospects }: Props) {
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Configuration
  const [type, setType] = useState<OutreachType>('PHONE')
  const [title, setTitle] = useState('Första kontakt')
  const [body, setBody] = useState('')

  // Email-specific state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailTemplateId, setEmailTemplateId] = useState('')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/email-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (isOpen) loadTemplates()
  }, [isOpen, loadTemplates])

  const today = new Date()
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7))
  const nextFriday = new Date(nextMonday)
  nextFriday.setDate(nextMonday.getDate() + 4)

  const [startDate, setStartDate] = useState(toDateValue(nextMonday))
  const [endDate, setEndDate] = useState(toDateValue(nextFriday))
  const [perDay, setPerDay] = useState(5)

  // Filter prospects by search
  const filteredProspects = useMemo(() => {
    if (!searchQuery) return prospects
    const q = searchQuery.toLowerCase()
    return prospects.filter(
      (p: Prospect) =>
        p.name.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.industry && p.industry.toLowerCase().includes(q)),
    )
  }, [prospects, searchQuery])

  // Calculate distribution preview
  const distribution = useMemo(() => {
    if (selected.size === 0 || !startDate || !endDate) return []
    return distributeProspects(
      Array.from(selected),
      new Date(startDate),
      new Date(endDate),
      Math.max(1, perDay),
    )
  }, [selected, startDate, endDate, perDay])

  const totalDistributed = distribution.reduce((sum: number, d: DistributionDay) => sum + d.prospectIds.length, 0)
  const overflow = selected.size - totalDistributed

  function toggleProspect(id: string) {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filteredProspects.map((p: Prospect) => p.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  function getProspectName(id: string): string {
    return prospects.find((p) => p.id === id)?.name ?? id
  }

  async function handleCreate() {
    if (selected.size === 0 || !title.trim() || !startDate || !endDate) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        customerIds: Array.from(selected),
        type,
        title: title.trim(),
        outreachBody: body.trim() || null,
        startDate,
        endDate,
        perDay,
      }
      if (type === 'EMAIL') {
        payload.subject = emailSubject.trim() || null
        payload.emailTemplateId = emailTemplateId || null
      }
      const res = await fetch('/api/outreach/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Kunde inte skapa outreach')
      }
      const data = await res.json()
      toast.success(`${data.created} outreach skapade`)
      // Reset state
      setSelected(new Set())
      setSearchQuery('')
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte skapa outreach')
    } finally {
      setSaving(false)
    }
  }

  const canCreate = selected.size > 0 && title.trim() && startDate && endDate && totalDistributed > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Planera outreach"
      description="Välj prospekts och konfigurera när de ska kontaktas."
      size="xl"
      panelClassName="sm:rounded-2xl shadow-zinc-950/20"
    >
      <ModalBody className="space-y-6 pb-2">
        {/* Prospect selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Välj prospekts ({selected.size} valda)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Markera alla
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-zinc-400 hover:text-zinc-600 font-medium"
                >
                  Avmarkera alla
                </button>
              )}
            </div>
          </div>

          {/* Prospect search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök prospekt..."
              className="h-9 pl-10 text-sm"
            />
          </div>

          {/* Prospect list */}
          <div className="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100">
            {filteredProspects.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-400">
                Inga prospekts hittades
              </div>
            ) : (
              filteredProspects.map((p) => {
                const isChecked = selected.has(p.id)
                return (
                  <label
                    key={p.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                      isChecked ? 'bg-blue-50/60' : 'hover:bg-zinc-50',
                    )}
                  >
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                      isChecked
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-zinc-300 bg-white',
                    )}>
                      {isChecked && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleProspect(p.id)}
                      className="sr-only"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-900">{p.name}</span>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {p.industry && (
                          <span className="text-[11px] text-zinc-400">{p.industry}</span>
                        )}
                        {p.city && (
                          <span className="text-[11px] text-zinc-400">{p.city}</span>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 block">
            Konfiguration
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="bulk-type" className="text-xs font-medium text-zinc-500">
                Typ av outreach
              </label>
              <Select
                id="bulk-type"
                value={type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as OutreachType)}
                className="h-10"
              >
                <option value="EMAIL">E-post</option>
                <option value="PHONE">Samtal</option>
                <option value="SMS">SMS</option>
                <option value="PHYSICAL">Fysisk kontakt</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="bulk-perday" className="text-xs font-medium text-zinc-500">
                Max per dag
              </label>
              <Input
                id="bulk-perday"
                type="number"
                min={1}
                max={50}
                value={perDay}
                onChange={(e) => setPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bulk-title" className="text-xs font-medium text-zinc-500">
              Titel
            </label>
            <Input
              id="bulk-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="T.ex. Första kontakt"
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="bulk-start" className="text-xs font-medium text-zinc-500">
                Startdatum
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="bulk-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bulk-end" className="text-xs font-medium text-zinc-500">
                Slutdatum
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="bulk-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 pl-10"
                />
              </div>
            </div>
          </div>

          {type === 'EMAIL' ? (
            <>
              {/* Template selector */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500">Mallval</label>
                  <Select
                    value={emailTemplateId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const tid = e.target.value
                      setEmailTemplateId(tid)
                      const tmpl = templates.find((t) => t.id === tid)
                      if (tmpl) {
                        setEmailSubject(tmpl.subject)
                        setBody(tmpl.body)
                      }
                    }}
                    className="h-10"
                  >
                    <option value="">Välj en mall (valfritt)…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Email subject */}
              <div className="space-y-2">
                <label htmlFor="bulk-subject" className="text-xs font-medium text-zinc-500">
                  Ämnesrad
                </label>
                <Input
                  id="bulk-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="T.ex. Erbjudande om samarbete…"
                  className="h-10"
                />
              </div>

              {/* Email body with variable buttons */}
              <div className="space-y-2">
                <label htmlFor="bulk-body" className="text-xs font-medium text-zinc-500">
                  Mejlinnehåll
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                      onClick={() => setBody((prev) => prev + `{{${v.key}}}`)}
                    >
                      {`{{${v.label}}}`}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="bulk-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Skriv mejlinnehåll… Använd {{variabler}} för personalisering."
                  rows={5}
                  className="resize-y font-mono text-sm"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="bulk-body" className="text-xs font-medium text-zinc-500">
                  Anteckningar
                </label>
                <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wide">Valfritt</span>
              </div>
              <Textarea
                id="bulk-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Gemensamma anteckningar för alla utskick..."
                rows={3}
                className="resize-y"
              />
            </div>
          )}
        </div>

        {/* Preview */}
        {selected.size > 0 && distribution.length > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 block">
              Förhandsvisning
            </label>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 space-y-1">
              <p className="text-sm font-medium text-zinc-700">
                {totalDistributed} prospekts fördelas över {distribution.length} dag{distribution.length !== 1 ? 'ar' : ''}
              </p>
              {overflow > 0 && (
                <p className="text-xs text-amber-600 font-medium">
                  {overflow} prospekts ryms inte i valt intervall. Utöka datumintervallet eller öka antalet per dag.
                </p>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {distribution.map((d) => {
                const Icon = typeIcons[type]
                return (
                  <div key={d.date.toISOString()} className="rounded-lg border border-zinc-100 bg-white p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-600 capitalize">
                        {formatSwedishDate(d.date)}
                      </span>
                      <span className="text-[10px] text-zinc-400 bg-zinc-100 rounded-full px-1.5 py-0.5">
                        {d.prospectIds.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.prospectIds.map((pid) => (
                        <span
                          key={pid}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {getProspectName(pid)}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="gap-3 px-6 py-5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="min-w-[5.5rem] rounded-lg border-zinc-200 bg-white"
        >
          Avbryt
        </Button>
        <Button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate || saving}
          className="min-w-[10rem] rounded-lg disabled:pointer-events-none disabled:opacity-45"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Skapa {totalDistributed > 0 ? `${totalDistributed} utskick` : 'outreach'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
