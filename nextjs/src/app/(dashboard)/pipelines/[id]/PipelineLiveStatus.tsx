"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast"

interface LiveData {
  status: string
  scrapeStartedAt: string | null
  lastScrapedAt: string | null
  scrapeCurrentPage: number | null
  scrapeCurrentUrl: string | null
  bolagsfaktaForetagCount: number | null
  foretagCount: number
  validForetagCount: number
  activeDetailCount: number
  totalDetailCount: number
  avgDetailDurationMs: number | null
}

interface Props {
  pipelineId: string
  initialStatus: string
  initialForetagCount: number
  initialValidForetagCount: number
  bolagsfaktaForetagCount: number | null
  initialActiveDetailCount: number
  scrapeStartedAt: string | null
  lastScrapedAt: string | null
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`
  }
  return `${seconds}s`
}

function truncateUrl(url: string, maxLen = 68): string {
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
  initialValidForetagCount,
  bolagsfaktaForetagCount,
  initialActiveDetailCount,
  scrapeStartedAt,
  lastScrapedAt,
}: Props) {
  const router = useRouter()
  const [data, setData] = useState<LiveData>({
    status: initialStatus,
    scrapeStartedAt,
    lastScrapedAt,
    scrapeCurrentPage: null,
    scrapeCurrentUrl: null,
    bolagsfaktaForetagCount,
    foretagCount: initialForetagCount,
    validForetagCount: initialValidForetagCount,
    activeDetailCount: initialActiveDetailCount,
    totalDetailCount: 0,
    avgDetailDurationMs: null,
  })
  const [stopping, setStopping] = useState(false)
  const [elapsed, setElapsed] = useState<number>(0)
  const [completedDuration, setCompletedDuration] = useState<number | null>(null)
  const [endedByStop, setEndedByStop] = useState(false)
  const prevStatusRef = useRef(initialStatus)
  const prevCountRef = useRef(initialForetagCount)

  useEffect(() => {
    setData((d) => ({ ...d, status: initialStatus }))
  }, [initialStatus])

  useEffect(() => {
    setData((d) => ({ ...d, activeDetailCount: initialActiveDetailCount }))
  }, [initialActiveDetailCount])

  // Elapsed timer — ticks every second while scraping is running
  useEffect(() => {
    const startedAt = data.scrapeStartedAt
    if (!startedAt || data.status !== "RUNNING") return

    const startMs = new Date(startedAt).getTime()
    function tick() {
      setElapsed(Date.now() - startMs)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data.scrapeStartedAt, data.status])

  useEffect(() => {
    if (prevStatusRef.current === "RUNNING" && data.status !== "RUNNING") {
      setEndedByStop(data.status === "STOPPED")
      if (data.scrapeStartedAt && data.lastScrapedAt) {
        const duration = new Date(data.lastScrapedAt).getTime() - new Date(data.scrapeStartedAt).getTime()
        setCompletedDuration(duration)
      } else if (data.scrapeStartedAt) {
        setCompletedDuration(elapsed)
      }
    }
    prevStatusRef.current = data.status
  }, [data.status, data.scrapeStartedAt, data.lastScrapedAt, elapsed])

  const isListRunning = data.status === "RUNNING"
  const hasDetailJobs = data.activeDetailCount > 0
  const showCompletedDuration = !isListRunning && completedDuration != null
  const shouldPoll = isListRunning || hasDetailJobs

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

        if (data.status === "RUNNING" && json.status !== "RUNNING") {
          router.refresh()
        }
        if (data.activeDetailCount > 0 && json.activeDetailCount === 0) {
          router.refresh()
        }
      } catch {
        // ignorera nätverksfel under polling
      }
    }

    poll()
    const id = setInterval(poll, 1500)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [shouldPoll, pipelineId, router, data.status, data.activeDetailCount])

  if (!isListRunning && !hasDetailJobs && !showCompletedDuration) return null

  const found = data.validForetagCount
  const total = data.validForetagCount
  const page = data.scrapeCurrentPage
  const initializing = isListRunning && page == null
  const listProgressPct = total > 0 ? 100 : null
  const detailDone = data.totalDetailCount - data.activeDetailCount
  const detailPct =
    data.totalDetailCount > 0
      ? Math.round((detailDone / data.totalDetailCount) * 100)
      : null

  async function handleStop() {
    setStopping(true)
    try {
      await Promise.all([
        isListRunning && fetch(`/api/pipelines/${pipelineId}/stop`, { method: "POST" }),
        hasDetailJobs && fetch(`/api/pipelines/${pipelineId}/stop-details`, { method: "POST" }),
      ])
      setEndedByStop(true)
      setData((d) => ({ ...d, status: "STOPPED", activeDetailCount: 0 }))
      toast.info("Scraping stoppad.")
      router.refresh()
    } catch {
      toast.error("Kunde inte stoppa. Försök igen.")
      setStopping(false)
    }
  }

  const containerBorder = isListRunning || hasDetailJobs
    ? "border-blue-200/60 bg-gradient-to-br from-blue-50/80 via-white to-white dark:border-blue-800/25 dark:from-blue-950/35 dark:via-zinc-900 dark:to-zinc-900"
    : endedByStop
      ? "border-red-200/60 bg-gradient-to-br from-red-50/80 via-white to-white dark:border-red-800/25 dark:from-red-950/35 dark:via-zinc-900 dark:to-zinc-900"
      : "border-green-200/60 bg-gradient-to-br from-green-50/80 via-white to-white dark:border-green-800/25 dark:from-green-950/35 dark:via-zinc-900 dark:to-zinc-900"

  return (
    <div className={`overflow-hidden rounded-xl border shadow-sm ${containerBorder}`}>
      <div className="px-5 py-4 space-y-3">

        {/* Elapsed timer (running) */}
        {isListRunning && data.scrapeStartedAt && (
          <div className="text-center">
            <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight">
              {formatElapsed(elapsed)}
            </span>
          </div>
        )}

        {/* Completed/stopped duration */}
        {showCompletedDuration && (
          <div className="text-center py-1">
            <span className={`text-3xl font-bold tabular-nums tracking-tight ${endedByStop ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              {formatElapsed(completedDuration!)}
            </span>
            <p className={`text-sm mt-1 ${endedByStop ? "text-red-600/80 dark:text-red-400/80" : "text-green-600/80 dark:text-green-400/80"}`}>
              {endedByStop ? "Scraping stoppad" : "Scraping klar"}
              {!endedByStop && data.avgDetailDurationMs != null && data.avgDetailDurationMs > 0 && (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="tabular-nums">
                    ~{formatElapsed(data.avgDetailDurationMs)} per företag
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {/* Status rows + stop */}
        {(isListRunning || hasDetailJobs) && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 min-w-0 flex-1">

              {/* Listskrapning */}
              {isListRunning && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-100 min-w-0">
                    {initializing ? (
                      <span className="text-gray-500 dark:text-zinc-400 italic">Initierar scraping…</span>
                    ) : (
                      <span className="flex flex-wrap items-baseline gap-x-1.5">
                        <span>
                          <span className="font-bold tabular-nums text-gray-900 dark:text-white">{found.toLocaleString("sv")}</span>
                          {total > 0 && (
                            <span className="text-gray-500 dark:text-zinc-400"> / {total.toLocaleString("sv")}</span>
                          )}
                          <span className="text-gray-500 dark:text-zinc-400"> företag</span>
                        </span>
                        {listProgressPct != null && (
                          <span className="text-gray-400 dark:text-zinc-500 text-xs">
                            ({listProgressPct}%)
                          </span>
                        )}
                        {page != null && (
                          <span className="text-gray-400 dark:text-zinc-500 text-xs">· sida {page}</span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Detaljhämtning */}
              {hasDetailJobs && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-brown opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-brown" />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    <span className="font-medium">Hämtar bolagsdata</span>
                    {data.totalDetailCount > 0 && (
                      <span className="text-gray-400 dark:text-zinc-500 ml-1.5 text-xs">
                        {detailDone}/{data.totalDetailCount}
                        {detailPct != null && <> ({detailPct}%)</>}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => void handleStop()}
              disabled={stopping}
              className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 hover:border-red-300 active:scale-95 disabled:opacity-50 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              {stopping ? "Stoppar…" : "Stoppa"}
            </button>
          </div>
        )}

        {/* Progressbar listskrapning */}
        {isListRunning && !initializing && listProgressPct != null && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${listProgressPct}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400 w-9 text-right shrink-0">
                {listProgressPct}%
              </span>
            </div>
            {data.scrapeCurrentUrl && (
              <p className="font-mono text-[11px] leading-relaxed text-gray-400 dark:text-zinc-500 truncate">
                {truncateUrl(data.scrapeCurrentUrl)}
              </p>
            )}
          </div>
        )}

        {/* Progressbar detaljhämtning */}
        {hasDetailJobs && detailPct != null && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30">
              <div
                className="h-full rounded-full bg-brand-brown transition-all duration-700"
                style={{ width: `${detailPct}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400 w-9 text-right shrink-0">
              {detailPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
