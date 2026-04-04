"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}
      {required && (
        <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>
      )}
    </label>
  )
}

export function RedlistAddForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [namn, setNamn] = useState("")
  const [orgNummer, setOrgNummer] = useState("")
  const [url, setUrl] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = namn.trim()
    if (!trimmed) {
      toast.error("Ange ett namn")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/bolagsfakta/redlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namn: trimmed,
          orgNummer: orgNummer.trim() || undefined,
          url: url.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Kunde inte spara")
        return
      }

      if (data.ok && data.entry) {
        toast.success(
          data.duplicate
            ? "Fanns redan i listan (samma org.nr eller URL)"
            : "Sparat",
        )
        setNamn("")
        setOrgNummer("")
        setUrl("")
        router.refresh()
      } else {
        toast.error("Oväntat svar från servern")
      }
    } catch {
      toast.error("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel-surface p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Lägg till företag</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel required>Namn</FieldLabel>
          <Input
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            placeholder="Företagsnamn"
            disabled={loading}
          />
        </div>
        <div>
          <FieldLabel>Org.nr</FieldLabel>
          <Input
            value={orgNummer}
            onChange={(e) => setOrgNummer(e.target.value)}
            placeholder="556123-4567"
            disabled={loading}
          />
        </div>
        <div>
          <FieldLabel>Bolagsfakta-URL</FieldLabel>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.bolagsfakta.se/..."
            disabled={loading}
            type="url"
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Sparar…" : "Lägg till"}
        </Button>
      </div>
    </form>
  )
}
