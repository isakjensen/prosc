"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SlidersHorizontal, Loader2, Play, RotateCcw } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/confirm/ConfirmProvider"

interface Props {
  pipelineId: string
  status: string
  hasActiveDetailJobs: boolean
  foretagCount: number
}

export default function PipelineActions({ pipelineId, status, hasActiveDetailJobs, foretagCount }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const confirm = useConfirm()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const filtersOpen = mounted && searchParams.get("filters") === "1"
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

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
    setLoading(true)
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
          body.detail && body.detail !== body.error ? `${main} — ${body.detail}` : main
        toast.error(combined)
        return
      }
      toast.success(body.message?.trim() || "Scraping startad.")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte starta scraping.")
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Återställ pipeline",
      description: `Alla ${foretagCount} skrapade företag tas bort och pipelinen återställs till utgångsläget.`,
      bullets: [
        "Företagen i pipelinen raderas",
        "Pipelinens status sätts till Inaktiv",
        "Kopplade CRM-kunder påverkas inte",
      ],
      confirmLabel: "Återställ",
      variant: "danger",
      irreversible: true,
    })
    if (!ok) return

    setResetting(true)
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/reset`, { method: "POST" })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        reset?: boolean
        deletedForetagCount?: number
      }
      if (!res.ok) {
        toast.error(body.error ?? `HTTP ${res.status}`)
        return
      }
      toast.success(`Pipeline återställd — ${body.deletedForetagCount ?? 0} företag borttagna.`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte återställa pipelinen.")
    } finally {
      setResetting(false)
    }
  }

  const canStart = status !== "RUNNING" && !hasActiveDetailJobs
  const canReset = status !== "RUNNING" && foretagCount > 0

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleFilters}
        disabled={loading || resetting}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {filtersOpen ? "Stäng filter" : "Filter"}
      </Button>

      {canReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleReset()}
          disabled={loading || resetting}
        >
          {resetting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Återställer…
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Återställ
            </>
          )}
        </Button>
      )}

      {canStart && (
        <Button
          size="sm"
          onClick={() => void handleScrape()}
          disabled={loading || resetting}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Startar…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Starta scraping
            </>
          )}
        </Button>
      )}
    </div>
  )
}
