"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SlidersHorizontal, Plus } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import AddCustomCompanyModal from "./AddCustomCompanyModal"

interface Props {
  pipelineId: string
  status: string
  isManual: boolean
}

function PipelineScrapeErrorAlert({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-950"
    >
      <p className="font-medium text-red-900">{title}</p>
      <div className="mt-0.5 break-words text-red-800">{children}</div>
    </div>
  )
}

export default function PipelineActions({ pipelineId, status, isManual }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const filtersOpen = mounted && searchParams.get("filters") === "1"
  const [loading, setLoading] = useState<"scrape" | "stop" | null>(null)
  const [error, setError] = useState("")
  const [addModalOpen, setAddModalOpen] = useState(false)

  function toggleFilters() {
    const next = new URLSearchParams(searchParams.toString())
    if (filtersOpen) {
      next.delete("filters")
    } else {
      next.set("filters", "1")
    }
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  async function handleScrape() {
    setLoading("scrape")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/scrape`, { method: "POST" })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        detail?: string
        message?: string
      }
      if (!res.ok) {
        const main = body.error ?? `HTTP ${res.status}`
        const combined =
          body.detail && body.detail !== body.error ? `${main} (${body.detail})` : main
        setError(combined)
        return
      }
      toast.info(body.message?.trim() || "Listskrapning startad — sidan uppdateras automatiskt.")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte starta scraping.")
    } finally {
      setLoading(null)
    }
  }

  async function handleStop() {
    setLoading("stop")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/stop`, { method: "POST" })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setError("Kunde inte stoppa pipeline. Försök igen.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:max-w-md sm:items-end">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={toggleFilters} disabled={loading !== null}>
            <SlidersHorizontal className="h-4 w-4" />
            {filtersOpen ? "Stäng filter" : "Filter"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setAddModalOpen(true)}
            disabled={loading !== null}
          >
            <Plus className="h-4 w-4" />
            Lägg till företag
          </Button>

          {!isManual && status !== "RUNNING" && loading !== "scrape" ? (
            <Button onClick={handleScrape} disabled={loading !== null}>
              Starta scraping
            </Button>
          ) : !isManual && loading === "scrape" && status !== "RUNNING" ? (
            <span className="inline-flex h-10 items-center px-1 text-sm text-gray-500">Startar…</span>
          ) : null}

          {!isManual && status === "RUNNING" && (
            <Button
              variant="destructive"
              onClick={handleStop}
              disabled={loading !== null}
              className="bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {loading === "stop" ? "Stoppar..." : "Stoppa"}
            </Button>
          )}
        </div>
        {error ? <PipelineScrapeErrorAlert title="Något gick fel">{error}</PipelineScrapeErrorAlert> : null}
      </div>

      <AddCustomCompanyModal
        pipelineId={pipelineId}
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
    </>
  )
}
