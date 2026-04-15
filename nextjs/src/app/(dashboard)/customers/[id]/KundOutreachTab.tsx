"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Calendar,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import EmailComposer from "@/components/email/EmailComposer"
import EmailStatusBadge from "@/components/email/EmailStatusBadge"
import type { VariableData } from "@/lib/email-variables"

type OutreachType = "EMAIL" | "PHONE" | "SMS" | "PHYSICAL"
type OutreachStatus = "PLANNED" | "COMPLETED"

interface OutreachItem {
  id: string
  title: string
  type: OutreachType
  scheduledAt: string
  recipients: string | null
  body: string | null
  subject: string | null
  sendAt: string | null
  emailStatus: string | null
  attachments: string | null
  status: OutreachStatus
  createdAt: string
  user?: { id: string; name: string } | null
}

const typeLabels: Record<OutreachType, string> = {
  EMAIL: "E-post",
  PHONE: "Samtal",
  SMS: "SMS",
  PHYSICAL: "Fysisk kontakt",
}

const typeIcons: Record<OutreachType, typeof Mail> = {
  EMAIL: Mail,
  PHONE: Phone,
  SMS: MessageSquare,
  PHYSICAL: Users,
}

const typeAccents: Record<OutreachType, string> = {
  EMAIL: "bg-blue-100 text-blue-800 ring-blue-200/80",
  PHONE: "bg-amber-100 text-amber-800 ring-amber-200/80",
  SMS: "bg-violet-100 text-violet-800 ring-violet-200/80",
  PHYSICAL: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
}

function toDateValue(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

export default function KundOutreachTab({
  customerId,
  customerData,
  contactEmails,
}: {
  customerId: string
  customerData?: { name?: string | null; city?: string | null; industry?: string | null; orgNumber?: string | null }
  contactEmails?: string[]
}) {
  const [items, setItems] = useState<OutreachItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formType, setFormType] = useState<OutreachType>("EMAIL")
  const [formDate, setFormDate] = useState("")
  const [formRecipients, setFormRecipients] = useState("")
  const [formBody, setFormBody] = useState("")
  const [formAttachments, setFormAttachments] = useState<string[]>([])
  const [formSubject, setFormSubject] = useState("")
  const [formSendAt, setFormSendAt] = useState("")
  const [formSendMode, setFormSendMode] = useState<"now" | "scheduled">("now")
  const [formTemplateId, setFormTemplateId] = useState("")

  // Edit modal
  const [editItem, setEditItem] = useState<OutreachItem | null>(null)

  // Detail modal
  const [detailItem, setDetailItem] = useState<OutreachItem | null>(null)

  const variableData: VariableData | undefined = customerData
    ? {
        foretag: customerData.name ?? "",
        stad: customerData.city ?? "",
        bransch: customerData.industry ?? "",
        orgnummer: customerData.orgNumber ?? "",
      }
    : undefined

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/outreach`)
      if (!res.ok) throw new Error("Kunde inte hämta outreach")
      const data = await res.json()
      setItems(data.outreaches ?? [])
    } catch {
      toast.error("Kunde inte hämta outreach-data")
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setFormTitle("")
    setFormType("EMAIL")
    setFormDate(toDateValue(new Date()))
    setFormRecipients("")
    setFormBody("")
    setFormAttachments([])
    setFormSubject("")
    setFormSendAt("")
    setFormSendMode("now")
    setFormTemplateId("")
    setCreateOpen(true)
  }

  function openEdit(item: OutreachItem) {
    setFormTitle(item.title)
    setFormType(item.type)
    setFormDate(toDateValue(new Date(item.scheduledAt)))
    setFormRecipients(parseRecipients(item.recipients).join(", "))
    setFormBody(item.body ?? "")
    setFormAttachments(parseAttachments(item.attachments))
    setFormSubject(item.subject ?? "")
    setFormSendAt(item.sendAt ?? "")
    setFormSendMode(item.sendAt ? "scheduled" : "now")
    setFormTemplateId("")
    setEditItem(item)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formDate) return
    setSaving(true)
    try {
      const recipients = formRecipients
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
      const payload: Record<string, unknown> = {
        title: formTitle,
        type: formType,
        scheduledAt: new Date(formDate).toISOString(),
        recipients: recipients.length > 0 ? recipients : null,
        body: formBody || null,
        attachments: formAttachments.length > 0 ? formAttachments : null,
      }
      if (formType === "EMAIL") {
        payload.subject = formSubject || null
        payload.sendAt = formSendMode === "scheduled" && formSendAt
          ? new Date(formSendAt).toISOString()
          : null
        payload.emailTemplateId = formTemplateId || null
      }
      const res = await fetch(`/api/customers/${customerId}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Kunde inte skapa")
      setCreateOpen(false)
      toast.success("Outreach skapad")
      await load()
    } catch {
      toast.error("Kunde inte skapa outreach")
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem || !formTitle.trim() || !formDate) return
    setSaving(true)
    try {
      const recipients = formRecipients
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
      const payload: Record<string, unknown> = {
        title: formTitle,
        type: formType,
        scheduledAt: new Date(formDate).toISOString(),
        recipients: recipients.length > 0 ? recipients : null,
        body: formBody || null,
        attachments: formAttachments.length > 0 ? formAttachments : null,
      }
      if (formType === "EMAIL") {
        payload.subject = formSubject || null
        payload.sendAt = formSendMode === "scheduled" && formSendAt
          ? new Date(formSendAt).toISOString()
          : null
      }
      const res = await fetch(
        `/api/customers/${customerId}/outreach/${editItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) throw new Error("Kunde inte uppdatera")
      setEditItem(null)
      toast.success("Outreach uppdaterad")
      await load()
    } catch {
      toast.error("Kunde inte uppdatera outreach")
    } finally {
      setSaving(false)
    }
  }

  async function handleSendEmail(outreachId: string) {
    setSending(outreachId)
    try {
      const res = await fetch(`/api/outreach/${outreachId}/send`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Kunde inte skicka")
      }
      toast.success("E-post skickad!")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte skicka e-post")
    } finally {
      setSending(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Ta bort den här outreachen?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/outreach/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Kunde inte ta bort")
      toast.success("Outreach borttagen")
      await load()
    } catch {
      toast.error("Kunde inte ta bort outreach")
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(item: OutreachItem) {
    const newStatus: OutreachStatus =
      item.status === "PLANNED" ? "COMPLETED" : "PLANNED"
    try {
      const res = await fetch(
        `/api/customers/${customerId}/outreach/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      )
      if (!res.ok) throw new Error("Kunde inte uppdatera status")
      toast.success(
        newStatus === "COMPLETED" ? "Markerad som genomförd" : "Markerad som planerad",
      )
      await load()
    } catch {
      toast.error("Kunde inte uppdatera status")
    }
  }

  function copyBody(item: OutreachItem) {
    const parts: string[] = []
    parts.push(`Titel: ${item.title}`)
    parts.push(`Typ: ${typeLabels[item.type]}`)
    parts.push(`Datum: ${formatDate(item.scheduledAt)}`)
    const recipients = parseRecipients(item.recipients)
    if (recipients.length > 0) parts.push(`Mottagare: ${recipients.join(", ")}`)
    if (item.body) parts.push(`\n${item.body}`)
    navigator.clipboard.writeText(parts.join("\n"))
    toast.success("Kopierat till urklipp")
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const names = Array.from(files).map((f) => f.name)
    setFormAttachments((prev) => [...prev, ...names])
    e.target.value = ""
  }

  function removeAttachment(index: number) {
    setFormAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const now = new Date()
  const planned = items.filter((i) => i.status === "PLANNED")
  const completed = items.filter((i) => i.status === "COMPLETED")

  const formModal = (
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (e: React.FormEvent) => void,
    title: string,
    submitLabel: string,
  ) => (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Planera en kontakt — mejl, samtal, SMS eller fysisk kontakt."
      size="lg"
      panelClassName="sm:rounded-2xl shadow-zinc-950/20"
    >
      <form onSubmit={onSubmit}>
        <ModalBody className="space-y-5 pb-2 overflow-x-hidden">
          <div className="space-y-2">
            <label
              htmlFor="outreach-title"
              className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              Titel
            </label>
            <Input
              id="outreach-title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="T.ex. Uppföljning kring offert…"
              className="h-11 text-base"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="outreach-type"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Typ
              </label>
              <Select
                id="outreach-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as OutreachType)}
                className="h-11"
              >
                <option value="EMAIL">E-post</option>
                <option value="PHONE">Samtal</option>
                <option value="SMS">SMS</option>
                <option value="PHYSICAL">Fysisk kontakt</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="outreach-date"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Planerat datum
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <Input
                  id="outreach-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </div>

          {formType === "EMAIL" ? (
            <EmailComposer
              subject={formSubject}
              onSubjectChange={setFormSubject}
              body={formBody}
              onBodyChange={setFormBody}
              recipients={formRecipients}
              onRecipientsChange={setFormRecipients}
              sendAt={formSendAt}
              onSendAtChange={setFormSendAt}
              sendMode={formSendMode}
              onSendModeChange={setFormSendMode}
              variableData={variableData}
              templateId={formTemplateId}
              onTemplateChange={setFormTemplateId}
              contactEmails={contactEmails}
            />
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label
                    htmlFor="outreach-recipients"
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    Mottagare
                  </label>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    Kommaseparerade
                  </span>
                </div>
                <Input
                  id="outreach-recipients"
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                  placeholder="namn@foretag.se, anna@foretag.se"
                  className="h-11"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label
                    htmlFor="outreach-body"
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    Anteckningar
                  </label>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    Valfritt
                  </span>
                </div>
                <Textarea
                  id="outreach-body"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={6}
                  placeholder="Anteckningar inför kontakten…"
                  className="min-h-[140px] resize-y leading-relaxed"
                />
              </div>
            </>
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
            type="submit"
            disabled={saving || !formTitle.trim() || !formDate}
            className="min-w-[10rem] rounded-lg disabled:pointer-events-none disabled:opacity-45"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {formType === "EMAIL"
              ? formSendMode === "scheduled"
                ? "Schemalägg utskick"
                : submitLabel
              : submitLabel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 mt-0.5">
            Planerade och genomförda kontakter
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" />
          Ny outreach
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            Ingen outreach planerad ännu
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Skapa en ny outreach för att planera kontakt med kunden.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Planned */}
          {planned.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Planerade ({planned.length})
              </h3>
              <div className="space-y-2">
                {planned.map((item) => {
                  const Icon = typeIcons[item.type]
                  const isPast = new Date(item.scheduledAt) < now
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex items-start gap-4 rounded-xl border p-4 transition-colors hover:bg-zinc-50/50",
                        isPast
                          ? "border-amber-200 bg-amber-50/30"
                          : "border-zinc-200 bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ring-white",
                          typeAccents[item.type],
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={isPast ? "warning" : "info"}>
                                {typeLabels[item.type]}
                              </Badge>
                              <time className="text-xs font-medium text-zinc-500 tabular-nums">
                                {formatDate(item.scheduledAt)}
                              </time>
                              {isPast && (
                                <span className="text-[10px] font-semibold uppercase text-amber-600">
                                  Försenad
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="mt-1 text-sm font-semibold text-zinc-900 hover:text-zinc-600 text-left transition-colors"
                              onClick={() => setDetailItem(item)}
                            >
                              {item.title}
                            </button>
                            {parseRecipients(item.recipients).length > 0 && (
                              <p className="text-xs text-zinc-500 mt-0.5">
                                Till: {parseRecipients(item.recipients).join(", ")}
                              </p>
                            )}
                            {item.type === "EMAIL" && item.emailStatus && (
                              <div className="mt-1">
                                <EmailStatusBadge status={item.emailStatus} />
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.type === "EMAIL" && !item.emailStatus && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleSendEmail(item.id)}
                                disabled={sending === item.id}
                                title="Skicka e-post"
                              >
                                {sending === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                <span className="text-xs">Skicka</span>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleStatus(item)}
                              title="Markera som genomförd"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
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
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(item.id)}
                              title="Ta bort"
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
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Genomförda ({completed.length})
              </h3>
              <div className="space-y-2">
                {completed.map((item) => {
                  const Icon = typeIcons[item.type]
                  return (
                    <div
                      key={item.id}
                      className="group flex items-start gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 transition-colors hover:bg-zinc-50"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ring-white opacity-60",
                          typeAccents[item.type],
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="success">Genomförd</Badge>
                              <span className="text-[10px] font-medium uppercase text-zinc-400">
                                {typeLabels[item.type]}
                              </span>
                              <time className="text-xs text-zinc-400 tabular-nums">
                                {formatDate(item.scheduledAt)}
                              </time>
                            </div>
                            <button
                              type="button"
                              className="mt-1 text-sm font-medium text-zinc-500 line-through text-left hover:text-zinc-700 transition-colors"
                              onClick={() => setDetailItem(item)}
                            >
                              {item.title}
                            </button>
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleStatus(item)}
                              title="Markera som planerad"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
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
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(item.id)}
                              title="Ta bort"
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
          )}
        </div>
      )}

      {/* Create modal */}
      {formModal(createOpen, () => setCreateOpen(false), handleCreate, "Ny outreach", "Skapa")}

      {/* Edit modal */}
      {formModal(!!editItem, () => setEditItem(null), handleEdit, "Redigera outreach", "Spara")}

      {/* Detail modal */}
      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title ?? ""}
        size="lg"
        panelClassName="sm:rounded-2xl shadow-zinc-950/20"
      >
        {detailItem && (
          <>
            <ModalBody className="space-y-4 pb-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant={detailItem.status === "COMPLETED" ? "success" : "info"}>
                  {detailItem.status === "COMPLETED" ? "Genomförd" : "Planerad"}
                </Badge>
                <Badge variant="gray">{typeLabels[detailItem.type]}</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Planerat datum</span>
                  <span className="font-medium text-zinc-900">
                    {formatDate(detailItem.scheduledAt)}
                  </span>
                </div>
                {detailItem.type === "EMAIL" && detailItem.subject && (
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
                      {parseRecipients(detailItem.recipients).join(", ")}
                    </span>
                  </div>
                )}
                {detailItem.type === "EMAIL" && detailItem.emailStatus && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-zinc-500">E-poststatus</span>
                    <EmailStatusBadge status={detailItem.emailStatus} />
                  </div>
                )}
                {detailItem.user && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Skapad av</span>
                    <span className="font-medium text-zinc-900">
                      {detailItem.user.name}
                    </span>
                  </div>
                )}
              </div>

              {detailItem.body && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {detailItem.type === "EMAIL" ? "Mejlinnehåll" : "Anteckningar"}
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
              {detailItem.type === "EMAIL" && !detailItem.emailStatus && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendEmail(detailItem.id)}
                  disabled={sending === detailItem.id}
                  className="gap-2 rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {sending === detailItem.id ? (
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
                  setDetailItem(null)
                  openEdit(detailItem)
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
    </div>
  )
}
