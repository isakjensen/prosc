'use client'

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  pipelineId: string
  status: string
}

export default function PipelineActions({ pipelineId, status }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const filtersOpen = mounted && searchParams.get("filters") === "1"
  const [loading, setLoading] = useState<'scrape' | 'stop' | null>(null)
  const [error, setError] = useState('')

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
    setLoading('scrape')
    setError('')
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/scrape`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte starta scraping.')
    } finally {
      setLoading(null)
    }
  }

  async function handleStop() {
    setLoading('stop')
    setError('')
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/stop`, { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setError('Kunde inte stoppa pipeline. Försök igen.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-2">
        <Button variant="outline" onClick={toggleFilters} disabled={loading !== null}>
          <SlidersHorizontal className="h-4 w-4" />
          {filtersOpen ? "Stäng filter" : "Filter"}
        </Button>
        <Button
          onClick={handleScrape}
          disabled={status === 'RUNNING' || loading !== null}
        >
          {loading === 'scrape' ? 'Startar...' : 'Starta scraping'}
        </Button>
        {status === 'RUNNING' && (
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={loading !== null}
          >
            {loading === 'stop' ? 'Stoppar...' : 'Stoppa'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
