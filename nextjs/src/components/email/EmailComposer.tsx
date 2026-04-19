"use client"

import { useCallback, useEffect, useState } from "react"
import { Calendar, Clock, Eye, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  AVAILABLE_VARIABLES,
  resolveVariables,
  type VariableData,
} from "@/lib/email-variables"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

interface EmailComposerProps {
  subject: string
  onSubjectChange: (subject: string) => void
  body: string
  onBodyChange: (body: string) => void
  recipients: string
  onRecipientsChange: (recipients: string) => void
  sendAt: string
  onSendAtChange: (sendAt: string) => void
  sendMode: "now" | "scheduled"
  onSendModeChange: (mode: "now" | "scheduled") => void
  variableData?: VariableData
  templateId?: string
  onTemplateChange?: (templateId: string) => void
  contactEmails?: string[]
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EmailComposer({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  recipients,
  onRecipientsChange,
  sendAt,
  onSendAtChange,
  sendMode,
  onSendModeChange,
  variableData,
  templateId,
  onTemplateChange,
  contactEmails,
}: EmailComposerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [scheduleError, setScheduleError] = useState("")

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/email-templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  function handleTemplateSelect(id: string) {
    onTemplateChange?.(id)
    if (!id) return
    const tmpl = templates.find((t) => t.id === id)
    if (tmpl) {
      onSubjectChange(tmpl.subject)
      onBodyChange(tmpl.body)
    }
  }

  function insertVariable(varKey: string) {
    const tag = `{{${varKey}}}`
    onBodyChange(body + tag)
  }

  function handleSendModeChange(mode: "now" | "scheduled") {
    onSendModeChange(mode)
    setScheduleError("")
    if (mode === "scheduled" && !sendAt) {
      const defaultTime = new Date()
      defaultTime.setHours(defaultTime.getHours() + 1, 0, 0, 0)
      onSendAtChange(toDatetimeLocal(defaultTime))
    }
  }

  function handleSendAtChange(value: string) {
    onSendAtChange(value)
    // Validate max 72h in the future
    if (value) {
      const selectedTime = new Date(value)
      const maxTime = new Date()
      maxTime.setHours(maxTime.getHours() + 72)
      if (selectedTime > maxTime) {
        setScheduleError("Schemaläggning stöder max 72 timmar framåt")
      } else if (selectedTime < new Date()) {
        setScheduleError("Sändtiden kan inte vara i det förflutna")
      } else {
        setScheduleError("")
      }
    }
  }

  const previewBody = variableData
    ? resolveVariables(body, variableData)
    : body
  const previewSubject = variableData
    ? resolveVariables(subject, variableData)
    : subject

  return (
    <div className="space-y-5">
      {/* Template selector */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Mallval
          </label>
          <Select
            value={templateId ?? ""}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="h-11"
          >
            <option value="">Välj en mall (valfritt)…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Recipients */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Mottagare
          </label>
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Kommaseparerade
          </span>
        </div>
        <Input
          value={recipients}
          onChange={(e) => onRecipientsChange(e.target.value)}
          placeholder="namn@foretag.se, anna@foretag.se"
          className="h-11"
          autoComplete="off"
        />
        {contactEmails && contactEmails.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {contactEmails.map((email) => (
              <button
                key={email}
                type="button"
                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                onClick={() => {
                  const current = recipients
                    .split(",")
                    .map((r) => r.trim())
                    .filter(Boolean)
                  if (!current.includes(email)) {
                    onRecipientsChange(
                      [...current, email].join(", "),
                    )
                  }
                }}
              >
                + {email}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Ämnesrad
        </label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="T.ex. Erbjudande om samarbete…"
          className="h-11 text-base"
          autoComplete="off"
        />
      </div>

      {/* Body with variable buttons */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Mejlinnehåll
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-brand-brown hover:opacity-90"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-3 w-3" />
            {showPreview ? "Dölj förhandsgranskning" : "Förhandsgranska"}
          </button>
        </div>

        {/* Variable insertion buttons */}
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
              onClick={() => insertVariable(v.key)}
              title={`Infoga {{${v.key}}}`}
            >
              {`{{${v.label}}}`}
            </button>
          ))}
        </div>

        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={8}
          placeholder="Skriv hela mejlet här… Använd {{variabler}} för personalisering."
          className="min-h-[180px] resize-y leading-relaxed font-mono text-sm"
        />
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-brown">
            Förhandsgranskning
          </h4>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Ämne:</p>
            <p className="text-sm font-medium text-zinc-900">
              {previewSubject || "(tomt)"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Innehåll:</p>
            <div className="rounded-md bg-white border border-blue-100 p-3">
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {previewBody || "(tomt)"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Send mode */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Sändval
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors ${
              sendMode === "now"
                ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
            onClick={() => handleSendModeChange("now")}
          >
            <Send className={`h-4 w-4 ${sendMode === "now" ? "text-blue-600" : "text-zinc-400"}`} />
            <div>
              <p className={`text-sm font-medium ${sendMode === "now" ? "text-blue-900" : "text-zinc-700"}`}>
                Skicka nu
              </p>
              <p className="text-[11px] text-zinc-500">Direkt vid sparande</p>
            </div>
          </button>
          <button
            type="button"
            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors ${
              sendMode === "scheduled"
                ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
            onClick={() => handleSendModeChange("scheduled")}
          >
            <Clock className={`h-4 w-4 ${sendMode === "scheduled" ? "text-brand-brown" : "text-zinc-400"}`} />
            <div>
              <p className={`text-sm font-medium ${sendMode === "scheduled" ? "text-blue-900" : "text-zinc-700"}`}>
                Schemalägg
              </p>
              <p className="text-[11px] text-zinc-500">Max 72 timmar framåt</p>
            </div>
          </button>
        </div>

        {sendMode === "scheduled" && (
          <div className="space-y-2">
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <Input
                type="datetime-local"
                value={sendAt}
                onChange={(e) => handleSendAtChange(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
            {scheduleError && (
              <p className="text-xs text-red-600 font-medium">{scheduleError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
