"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface LiveData {
  status: string
  scrapeCurrentPage: number | null
  scrapeCurrentUrl: string | null
  bolagsfaktaForetagCount: number | null
  foretagCount: number
  activeDetailCount: number
  totalDetailCount: number
}

interface Props {
  pipelineId: string
  initialStatus: string
  initialForetagCount: number
  bolagsfaktaForetagCount: number | null
  initialActiveDetailCount: number
}

function truncateUrl(url: string, maxLen = 72): string {
  if (url.length <= maxLen) return url
  try {
    const u = new URL(url)
    const path = u.pathname + u.search
    if (path.length <= maxLen - u.hostname.length - 3) return url
    return u.hostname + "/…" + path.slice(-(maxLen - u.hostname.length - 2))
  } catch {
    return "…" + url.slice(-(maxLen - 1))
  }
}

export default function PipelineLiveStatus({
  pipelineId,
  initialStatus,
  initialForetagCount,
  bolagsfaktaForetagCount,
  initialActiveDetailCount,
}: Props) {
  const router = useRouter()
  const [data, setData] = useState<LiveData>({
    status: initialStatus,
    scrapeCurrentPage: null,
    scrapeCurrentUrl: null,
    bolagsfaktaForetagCount,
    foretagCount: initialForetagCount,
    activeDetailCount: initialActiveDetailCount,
    totalDetailCount: 0,
  })
  const [stopping, setStopping] = useState(false)
  const prevCountRef = useRef(initialForetagCount)

  // Synka när servern skickar ny status (t.ex. efter router.refresh())
  useEffect(() => {
    setData((d) => ({ ...d, status: initialStatus }))
  }, [initialStatus])

  useEffect(() => {
    setData((d) => ({ ...d, activeDetailCount: initialActiveDetailCount }))
  }, [initialActiveDetailCount])

  const isListRunning = data.status === "RUNNING"
  const hasDetailJobs = data.activeDetailCount > 0
  const shouldPoll = isListRunning || hasDetailJobs

  // Polling medan listskrapning körs ELLER detaljhämtning pågår
  useEffect(() => {
    if (!shouldPoll) return

    let active = true

    async function poll() {
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}/live`, { cache: "no-store" })
        if (!res.ok) return
        const json: LiveData = await res.json()
        if (!active) return
        setData(json)
        prevCountRef.current = json.foretagCount

        // Full refresh när listskrapning avslutas
        if (data.status === "RUNNING" && json.status !== "RUNNING") {
          router.refresh()
        }
        // Full refresh när alla detaljjobb klara
        if (data.activeDetailCount > 0 && json.activeDetailCount === 0) {
          router.refresh()
        }
      } catch {
        // ignorera
      }
    }

    poll()
    const id = setInterval(poll, 1500)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [shouldPoll, pipelineId, router, data.status, data.activeDetailCount])

  if (!isListRunning && !hasDetailJobs) return null

  const total = data.bolagsfaktaForetagCount
  const found = data.foretagCount
  const page = data.scrapeCurrentPage
  const initializing = isListRunning && page == null
  const listProgressPct = total && total > 0 ? Math.min(100, Math.round((found / total) * 100)) : null
  const detailDone = data.totalDetailCount - data.activeDetailCount
  const detailPct = data.totalDetailCount > 0
    ? Math.round((detailDone / data.totalDetailCount) * 100)
    : null

  async function handleStop() {
    setStopping(true)
    try {
      await Promise.all([
        isListRunning && fetch(`/api/pipelines/${pipelineId}/stop`, { method: "POST" }),
        hasDetailJobs && fetch(`/api/pipelines/${pipelineId}/stop-details`, { method: "POST" }),
      ])
      setData((d) => ({ ...d, status: "STOPPED", activeDetailCount: 0 }))
      router.refresh()
    } catch {
      setStopping(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 space-y-3">

      {/* Header-rad med stop-knapp */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">

          {/* Listskrapning */}
          {isListRunning && (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                {initializing ? (
                  <span className="text-gray-500 dark:text-zinc-400">Initierar scraping…</span>
                ) : (
                  <>
                    <span className="tabular-nums font-semibold">{found}</span>
                    <span className="text-gray-500 dark:text-zinc-400"> företag hittade</span>
                    {total != null && total > 0 && (
                      <span className="text-gray-400 dark:text-zinc-500"> / {total} ({listProgressPct}%)</span>
                    )}
                    <span className="ml-2 text-gray-400 text-xs dark:text-zinc-500">sida {page}</span>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Detaljhämtning (BF-data) */}
          {hasDetailJobs && (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
              </span>
              <span className="text-sm text-gray-700 dark:text-zinc-300">
                <span className="font-medium">Hämtar bolagsdata</span>
                {data.totalDetailCount > 0 && (
                  <span className="text-gray-500 dark:text-zinc-400">
                    {" "}— {detailDone}/{data.totalDetailCount}
                    {detailPct != null && <span> ({detailPct}%)</span>}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* En enda stop-knapp */}
        <button
          onClick={handleStop}
          disabled={stopping}
          className="shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
        >
          {stopping ? "Stoppar…" : "Stoppa"}
        </button>
      </div>

      {/* Progressbars */}
      {isListRunning && !initializing && (
        <div className="space-y-1.5">
          {listProgressPct != null && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-700"
                style={{ width: `${listProgressPct}%` }}
              />
            </div>
          )}
          {data.scrapeCurrentUrl && (
            <p className="font-mono text-xs text-gray-400 dark:text-zinc-500 truncate">
              {truncateUrl(data.scrapeCurrentUrl)}
            </p>
          )}
        </div>
      )}
      {hasDetailJobs && detailPct != null && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-700"
            style={{ width: `${detailPct}%` }}
          />
        </div>
      )}
    </div>
  )
}
