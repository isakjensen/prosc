"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Building2,
  Calendar,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import type { FlowItemJson, FlowItemKind } from "@/lib/customer-flow-types"
import { cn, formatDate } from "@/lib/utils"

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const kindMeta: Record<
  FlowItemKind,
  { label: string; icon: typeof Calendar; accent: string }
> = {
  custom_note: {
    label: "Anteckning",
    icon: MessageSquare,
    accent: "bg-violet-100 text-violet-800 ring-violet-200/80",
  },
  meeting: {
    label: "Möte",
    icon: Users,
    accent: "bg-sky-100 text-sky-800 ring-sky-200/80",
  },
  quote: {
    label: "Offert",
    icon: FileText,
    accent: "bg-amber-100 text-amber-900 ring-amber-200/80",
  },
  bolagsfakta_scrape: {
    label: "Bolagsfakta",
    icon: Sparkles,
    accent: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  },
  customer_record: {
    label: "Kundpost",
    icon: Building2,
    accent: "bg-zinc-200 text-zinc-800 ring-zinc-300/80",
  },
  prospect_milestone: {
    label: "Prospekt",
    icon: TrendingUp,
    accent: "bg-indigo-100 text-indigo-900 ring-indigo-200/80",
  },
  activity: {
    label: "Aktivitet",
    icon: Calendar,
    accent: "bg-orange-100 text-orange-900 ring-orange-200/80",
  },
}

export default function KundFlodeTab({ customerId }: { customerId: string }) {
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<FlowItemJson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  /** Tom tills efter mount — undviker SSR/klient TZ-skillnad för datetime-local */
  const [newOccurred, setNewOccurred] = useState("")

  const [dateModal, setDateModal] = useState<FlowItemJson | null>(null)
  const [dateEditValue, setDateEditValue] = useState("")

  const [noteModal, setNoteModal] = useState<FlowItemJson | null>(null)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteDescription, setNoteDescription] = useState("")
  const [noteOccurred, setNoteOccurred] = useState("")

  const [newEventModalOpen, setNewEventModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/kunder/${customerId}/flode`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Kunde inte hämta flöde")
      }
      const data = await res.json()
      setItems(data.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel")
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    setMounted(true)
    setNewOccurred(toDatetimeLocalValue(new Date()))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const occurredRaw = newOccurred || toDatetimeLocalValue(new Date())
    const occurred = fromDatetimeLocalValue(occurredRaw)
    if (!occurred) return
    setSaving(true)
    try {
      const res = await fetch(`/api/kunder/${customerId}/flode/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: newDescription.trim() || null,
          occurredAt: occurred.toISOString(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Kunde inte spara")
      }
      closeNewEventModal()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  function openDateEditor(item: FlowItemJson) {
    setDateEditValue(toDatetimeLocalValue(new Date(item.occurredAt)))
    setDateModal(item)
  }

  async function saveDateOverride() {
    if (!dateModal) return
    const d = fromDatetimeLocalValue(dateEditValue)
    if (!d) return
    setSaving(true)
    try {
      if (dateModal.kind === "custom_note") {
        const res = await fetch(
          `/api/kunder/${customerId}/flode/notes/${dateModal.sourceId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ occurredAt: d.toISOString() }),
          },
        )
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? "Kunde inte uppdatera")
        }
      } else {
        const res = await fetch(`/api/kunder/${customerId}/flode/overrides`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: dateModal.kind,
            sourceId: dateModal.sourceId,
            occurredAt: d.toISOString(),
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? "Kunde inte uppdatera")
        }
      }
      setDateModal(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera")
    } finally {
      setSaving(false)
    }
  }

  function openNoteEditor(item: FlowItemJson) {
    setNoteTitle(item.title)
    setNoteDescription(item.description ?? "")
    setNoteOccurred(toDatetimeLocalValue(new Date(item.occurredAt)))
    setNoteModal(item)
  }

  async function saveNoteEdit() {
    if (!noteModal) return
    const title = noteTitle.trim()
    if (!title) return
    const occurred = fromDatetimeLocalValue(noteOccurred)
    if (!occurred) return
    setSaving(true)
    try {
      const res = await fetch(
        `/api/kunder/${customerId}/flode/notes/${noteModal.sourceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: noteDescription.trim() || null,
            occurredAt: occurred.toISOString(),
          }),
        },
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Kunde inte spara")
      }
      setNoteModal(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Ta bort den här händelsen?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/kunder/${customerId}/flode/notes/${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Kunde inte ta bort")
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte ta bort")
    } finally {
      setSaving(false)
    }
  }

  function openNewEventModal() {
    setNewEventModalOpen(true)
    setNewOccurred((v) => v || toDatetimeLocalValue(new Date()))
  }

  function closeNewEventModal() {
    setNewEventModalOpen(false)
    setNewTitle("")
    setNewDescription("")
    setNewOccurred("")
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" onClick={openNewEventModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Ny händelse
        </Button>
      </div>

      <Modal
        isOpen={newEventModalOpen}
        onClose={closeNewEventModal}
        title="Ny händelse"
        description="Läggs i tidslinjen med nyast överst. Datum går att ändra i efterhand i flödet."
        size="lg"
        panelClassName="rounded-2xl shadow-zinc-950/20"
      >
        <form onSubmit={submitNote}>
          <ModalBody className="space-y-5 pb-2">
            <div className="space-y-2">
              <label
                htmlFor="flow-new-title"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                Titel
              </label>
              <Input
                id="flow-new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="T.ex. Initierat kontakt, planeringsmöte…"
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor="flow-new-desc"
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Beskrivning
                </label>
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Valfritt
                </span>
              </div>
              <Textarea
                id="flow-new-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
                placeholder="Mer kontext, nästa steg, idéer till appen…"
                className="min-h-[100px] resize-y leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="flow-new-when"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                När hände det?
              </label>
              <div className="relative max-w-full sm:max-w-xs">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                  aria-hidden
                />
                <Input
                  id="flow-new-when"
                  type="datetime-local"
                  value={newOccurred}
                  onChange={(e) => setNewOccurred(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="gap-3 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={closeNewEventModal}
              className="min-w-[5.5rem] rounded-lg border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-900"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={!mounted || saving || !newTitle.trim() || !newOccurred}
              className="min-w-[10rem] rounded-lg disabled:pointer-events-none disabled:opacity-45"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lägg till i flödet
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="relative">
        {loading ? (
          <div className="flex justify-center py-16 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">Inget i flödet ännu</p>
        ) : (
          <div className="relative pl-4 sm:pl-6">
            {/* Centrerad i ikon-cirkeln: padding vänster + halva w-8 (16px) */}
            <div
              className="absolute left-8 sm:left-10 top-2 bottom-2 w-px -translate-x-1/2 bg-gradient-to-b from-zinc-200 via-zinc-300 to-transparent dark:from-zinc-700 dark:via-zinc-600"
              aria-hidden
            />
            <ul className="space-y-0">
              {items.map((item, i) => {
                const meta = kindMeta[item.kind]
                const Icon = meta.icon
                return (
                  <li key={`${item.kind}-${item.sourceId}-${i}`} className="relative pb-8 last:pb-0">
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-950",
                          meta.accent,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                {meta.label}
                              </span>
                              <time
                                className="text-xs font-medium text-zinc-600 dark:text-zinc-300 tabular-nums"
                                dateTime={item.occurredAt}
                              >
                                {formatDate(item.occurredAt)}
                              </time>
                            </div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                              {item.href ? (
                                <Link
                                  href={item.href}
                                  className="hover:text-zinc-600 dark:hover:text-zinc-300 underline-offset-2 hover:underline"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                item.title
                              )}
                            </h4>
                            {item.subtitle && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 whitespace-pre-wrap">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {item.editable.date && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openDateEditor(item)}
                                title="Ändra datum"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {item.editable.noteFields && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openNoteEditor(item)}
                                  title="Redigera"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => deleteNote(item.sourceId)}
                                  title="Ta bort"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!dateModal}
        onClose={() => setDateModal(null)}
        title="Datum i flödet"
        description="Påverkar bara sortering och visning här — inte mötestid eller offert i systemet."
        size="sm"
        panelClassName="rounded-2xl"
      >
        <ModalBody className="space-y-3 py-5">
          <label
            htmlFor="flow-date-edit"
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Datum & tid
          </label>
          <div className="relative">
            <Calendar
              className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              aria-hidden
            />
            <Input
              id="flow-date-edit"
              type="datetime-local"
              value={dateEditValue}
              onChange={(e) => setDateEditValue(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
        </ModalBody>
        <ModalFooter className="gap-3 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDateModal(null)}
            className="rounded-lg border-zinc-200 dark:border-zinc-600"
          >
            Avbryt
          </Button>
          <Button
            type="button"
            onClick={saveDateOverride}
            disabled={saving}
            className="rounded-lg disabled:opacity-45"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Spara
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!noteModal}
        onClose={() => setNoteModal(null)}
        title="Redigera händelse"
        description="Ändringar syns i tidslinjen för den här kunden."
        size="lg"
        panelClassName="rounded-2xl shadow-zinc-950/20"
      >
        <ModalBody className="space-y-5 pb-2">
          <div className="space-y-2">
            <label
              htmlFor="flow-note-title"
              className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Titel
            </label>
            <Input
              id="flow-note-title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="flow-note-desc"
              className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Beskrivning
            </label>
            <Textarea
              id="flow-note-desc"
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              rows={4}
              className="min-h-[100px] resize-y leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="flow-note-when"
              className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              När hände det?
            </label>
            <div className="relative max-w-full sm:max-w-xs">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                aria-hidden
              />
              <Input
                id="flow-note-when"
                type="datetime-local"
                value={noteOccurred}
                onChange={(e) => setNoteOccurred(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="gap-3 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setNoteModal(null)}
            className="rounded-lg border-zinc-200 dark:border-zinc-600"
          >
            Avbryt
          </Button>
          <Button
            type="button"
            onClick={saveNoteEdit}
            disabled={saving}
            className="rounded-lg disabled:opacity-45"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Spara
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
