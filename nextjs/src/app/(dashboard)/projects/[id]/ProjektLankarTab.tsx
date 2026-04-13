"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ProjektLinkRow = {
  id: string
  title: string
  url: string
}

interface Props {
  projektId: string
  links: ProjektLinkRow[]
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}
      {required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

export default function ProjektLankarTab({ projektId, links: initialLinks }: Props) {
  const router = useRouter()
  const [links, setLinks] = useState<ProjektLinkRow[]>(initialLinks)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const title = String(fd.get("title") ?? "").trim()
    const url = String(fd.get("url") ?? "").trim()
    try {
      const res = await fetch(`/api/projects/${projektId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Kunde inte spara länken.")
        return
      }
      const created = data as ProjektLinkRow
      setLinks((prev) => [...prev, created])
      form.reset()
      setShowForm(false)
      router.refresh()
    } catch {
      toast.error("Kunde inte spara länken. Försök igen.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(linkId: string) {
    try {
      const res = await fetch(`/api/projects/${projektId}/links/${linkId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
      router.refresh()
    } catch {
      toast.error("Kunde inte ta bort länken.")
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Lägg till bokmärken med valfri titel (t.ex. &quot;GitHub&quot;, &quot;Figma&quot;, &quot;Skisser&quot;) och
        webbadress. Länkar öppnas i ny flik.
      </p>

      {links.length === 0 && !showForm ? (
        <div className="panel-surface p-10 text-center text-gray-400 text-sm">Inga länkar ännu</div>
      ) : (
        <div className="panel-surface divide-y divide-gray-100">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{link.title}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-700 hover:underline break-all"
                >
                  {link.url}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </a>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 self-start sm:self-center shrink-0"
                onClick={() => handleRemove(link.id)}
              >
                Ta bort
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Ny länk</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <FieldLabel required>Titel</FieldLabel>
                <Input name="title" required placeholder="T.ex. Koddatabas" />
              </div>
              <div>
                <FieldLabel required>Webbadress</FieldLabel>
                <Input name="url" required placeholder="https://… eller example.com" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Sparar…" : "Lägg till"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Avbryt
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          + Lägg till länk
        </Button>
      )}
    </div>
  )
}
