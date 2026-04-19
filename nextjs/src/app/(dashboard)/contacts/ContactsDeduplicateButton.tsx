"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal"
import type { ContactDedupePlanEntry } from "@/lib/contact-dedupe"

type PreviewResponse = {
  plan: ContactDedupePlanEntry[]
  removedCount: number
}

function reasonLabel(reason: ContactDedupePlanEntry["reason"]) {
  if (reason === "multiple_roles") {
    return "Flera olika roller för samma namn"
  }
  return "Samma namn och samma roll (dubbletter)"
}

export function ContactsDeduplicateButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)

  async function loadPreview() {
    setLoading(true)
    try {
      const res = await fetch("/api/contacts/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? "Kunde inte analysera kontakter")
        return
      }
      const data = (await res.json()) as PreviewResponse
      setPreview(data)
    } catch {
      toast.error("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    setPreview(null)
    void loadPreview()
  }

  async function handleConfirm() {
    setExecuting(true)
    try {
      const res = await fetch("/api/contacts/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? "Kunde inte ta bort dubbletter")
        return
      }
      const data = (await res.json()) as { removedCount: number }
      toast.success(
        data.removedCount === 0
          ? "Inga dubbletter att ta bort"
          : `Tog bort ${data.removedCount} kontakt${data.removedCount === 1 ? "" : "er"}`,
      )
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Nätverksfel")
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={handleOpen}>
        Rensa dubbletter
      </Button>

      <Modal
        isOpen={open}
        onClose={() => !executing && setOpen(false)}
        title="Rensa dubbletter per företag"
        description="Samma namn inom ett företag: dubbletter med samma roll tas bort (en behålls). Om samma namn har flera olika roller tas alla kontaktrader bort för det namnet."
        size="lg"
      >
        <ModalBody>
          {loading && (
            <p className="text-sm text-gray-500 dark:text-zinc-400">Analyserar kontakter…</p>
          )}
          {!loading && preview && preview.plan.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-zinc-300">
              Inga dubbletter hittades. Alla kontakter är redan unika enligt reglerna.
            </p>
          )}
          {!loading && preview && preview.plan.length > 0 && (
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto space-y-4 pr-1">
              {preview.plan.map((entry, i) => (
                <div
                  key={`${entry.customerId}-${entry.firstName}-${entry.lastName}-${entry.reason}-${i}`}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-3 text-sm"
                >
                  <div className="font-medium text-gray-900 dark:text-zinc-100">
                    {entry.firstName} {entry.lastName}
                    <span className="font-normal text-gray-500 dark:text-zinc-400">
                      {" "}
                      · {entry.customerName}
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                    {reasonLabel(entry.reason)}
                  </p>
                  {entry.reason === "duplicate_same_role" && entry.kept && (
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2">
                      Behålls:{" "}
                      <span className="font-mono text-[11px]">{entry.kept.id.slice(0, 8)}…</span>
                      {entry.kept.role ? ` · ${entry.kept.role}` : ""}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-zinc-300">
                    {entry.remove.map((r) => (
                      <li key={r.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="font-mono text-[11px] text-gray-500">{r.id.slice(0, 8)}…</span>
                        {r.role && <span>{r.role}</span>}
                        {r.title && <span className="text-gray-500">({r.title})</span>}
                        {r.email && <span className="text-gray-500">{r.email}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={executing}>
            Avbryt
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !preview || preview.plan.length === 0 || executing}
          >
            {executing ? "Tar bort…" : "Ta bort listade kontakter"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
