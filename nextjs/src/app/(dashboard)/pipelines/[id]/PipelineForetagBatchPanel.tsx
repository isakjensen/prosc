"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, Play, Square, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import PipelineForetagTable, {
  type PipelineForetagRow,
  type BatchStatus,
  isEligibleForBatch,
} from "./PipelineForetagTable"

interface Props {
  pipelineId: string
  rows: PipelineForetagRow[]
}

export default function PipelineForetagBatchPanel({ pipelineId, rows }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const filtersOpen = mounted && searchParams.get("filters") === "1"

  const [liveRows, setLiveRows] = useState<PipelineForetagRow[]>(rows)
  useEffect(() => setLiveRows(rows), [rows])

  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "org" | "stage" | "fetched">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [stageFilter, setStageFilter] = useState<
    "all" | "PIPELINE" | "SCRAPED" | "PROSPECT" | "CUSTOMER" | "ARCHIVED"
  >("all")
  const [onlyMissingFixedData, setOnlyMissingFixedData] = useState(false)
  const [onlyHasFetchedData, setOnlyHasFetchedData] = useState(false)
  const [hideRedlisted, setHideRedlisted] = useState(false)
  const [onlyEligibleForBatch, setOnlyEligibleForBatch] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchRunning, setBatchRunning] = useState(false)
  const [statuses, setStatuses] = useState<Map<string, BatchStatus>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const abortRef = useRef<AbortController | null>(null)
  const [redlistRunning, setRedlistRunning] = useState(false)

  const hasActiveDetailJobs = liveRows.some(
    (r) => r.detailStatus === "QUEUED" || r.detailStatus === "RUNNING",
  )

  useEffect(() => {
    if (!hasActiveDetailJobs && !batchRunning) return

    const id = window.setInterval(() => {
      fetch(`/api/pipelines/${pipelineId}/companies`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.rows)) {
            setLiveRows(data.rows as PipelineForetagRow[])
          }
        })
        .catch(() => {})
    }, 1500)

    return () => window.clearInterval(id)
  }, [pipelineId, hasActiveDetailJobs, batchRunning])

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = liveRows.filter((r) => {
      if (hideRedlisted && r.isRedlisted) return false
      if (onlyMissingFixedData && r.hasBolagsfakta) return false
      if (onlyHasFetchedData && !r.hasBolagsfakta) return false
      if (onlyEligibleForBatch && !isEligibleForBatch(r)) return false

      if (stageFilter !== "all") {
        if (stageFilter === "PIPELINE") {
          if (r.customerId) return false
        } else {
          if (r.customerStage !== stageFilter) return false
        }
      }
      if (!q) return true
      const hay = `${r.namn ?? ""} ${r.orgNummer ?? ""} ${r.adress ?? ""}`.toLowerCase()
      return hay.includes(q)
    })

    filtered.sort((a, b) => {
      let cmp = 0
      if (sortBy === "fetched") {
        const aTs = a.bolagsfaktaUpdatedAt ? Date.parse(a.bolagsfaktaUpdatedAt) : -Infinity
        const bTs = b.bolagsfaktaUpdatedAt ? Date.parse(b.bolagsfaktaUpdatedAt) : -Infinity
        cmp = aTs === bTs ? 0 : aTs < bTs ? -1 : 1
      } else if (sortBy === "org") {
        cmp = (a.orgNummer ?? "").localeCompare(b.orgNummer ?? "", "sv")
      } else if (sortBy === "stage") {
        const aStage = a.customerId ? (a.customerStage ?? "") : "PIPELINE"
        const bStage = b.customerId ? (b.customerStage ?? "") : "PIPELINE"
        cmp = aStage.localeCompare(bStage, "sv")
        if (cmp === 0) {
          cmp = (a.namn ?? "").localeCompare(b.namn ?? "", "sv")
        }
      } else {
        cmp = (a.namn ?? "").localeCompare(b.namn ?? "", "sv")
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

    return filtered
  }, [
    liveRows,
    query,
    sortBy,
    sortOrder,
    stageFilter,
    onlyMissingFixedData,
    onlyHasFetchedData,
    hideRedlisted,
    onlyEligibleForBatch,
  ])

  const eligibleRows = visibleRows.filter(isEligibleForBatch)

  const completedCount = [...statuses.values()].filter((s) => s === "success").length
  const failedCount = [...statuses.values()].filter((s) => s === "error").length
  const totalBatch = [...statuses.values()].length
  const processedCount = completedCount + failedCount

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const eligibleIds = eligibleRows.map((r) => r.id)
      const allSelected = eligibleIds.every((id) => prev.has(id))
      if (allSelected) {
        return new Set()
      }
      return new Set(eligibleIds)
    })
  }, [eligibleRows])

  async function runBatch() {
    function sleep(ms: number) {
      return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
    }

    const idsToProcess = [...selectedIds].filter((id) =>
      liveRows.find((r) => r.id === id && isEligibleForBatch(r)),
    )

    if (idsToProcess.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller
    setBatchRunning(true)

    const initialStatuses = new Map<string, BatchStatus>()
    for (const id of idsToProcess) {
      initialStatuses.set(id, "pending")
    }
    setStatuses(initialStatuses)
    setErrors(new Map())

    let succeeded = 0
    let failed = 0

    const concurrency = 3
    const queue = [...idsToProcess]

    async function worker() {
      while (!controller.signal.aborted) {
        const foretagId = queue.shift()
        if (!foretagId) return

        setStatuses((prev) => new Map(prev).set(foretagId, "running"))

        try {
          // Stagger starts to avoid a burst of requests.
          await sleep(200 + Math.floor(Math.random() * 500))

          const res = await fetch(`/api/pipelines/${pipelineId}/companies/${foretagId}/fetch-detail`, {
            method: "POST",
            signal: controller.signal,
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
          }

          // This call now queues the job (scraping happens in scraping-api independently).
          setStatuses((prev) => new Map(prev).set(foretagId, "success"))
          setSelectedIds((prev) => {
            if (!prev.has(foretagId)) return prev
            const next = new Set(prev)
            next.delete(foretagId)
            return next
          })
          succeeded++
        } catch (e) {
          if (controller.signal.aborted) {
            setStatuses((prev) => new Map(prev).set(foretagId, "pending"))
            return
          }
          const msg = e instanceof Error ? e.message : "Okänt fel"
          setStatuses((prev) => new Map(prev).set(foretagId, "error"))
          setErrors((prev) => new Map(prev).set(foretagId, msg))
          failed++
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    setBatchRunning(false)
    abortRef.current = null
    router.refresh()

    if (controller.signal.aborted) {
      toast.info(`Batch avbruten — ${succeeded} köade, ${failed} misslyckades`)
    } else if (failed === 0) {
      toast.success(`Alla ${succeeded} företag köades`)
    } else {
      toast.warning(`${succeeded} köade, ${failed} misslyckades`)
    }
  }

  function handleAbort() {
    abortRef.current?.abort()
  }

  async function runRedlistSelected() {
    const selected = [...selectedIds]
    if (selected.length === 0) return

    const idsToRedlist = selected.filter((id) => {
      const r = liveRows.find((row) => row.id === id)
      return r && !r.isRedlisted
    })

    if (idsToRedlist.length === 0) {
      toast.info("Alla markerade företag är redan redlistade")
      return
    }

    const ok = window.confirm(
      `Redlista ${idsToRedlist.length} markerade företag? Detta påverkar vilka företag som kan hämtas.`,
    )
    if (!ok) return

    setRedlistRunning(true)
    try {
      let succeeded = 0
      let failed = 0

      const concurrency = 5
      const queue = [...idsToRedlist]

      async function worker() {
        while (queue.length > 0) {
          const foretagId = queue.shift()
          if (!foretagId) return

          try {
            const res = await fetch("/api/company-facts/redlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ foretagId }),
            })
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
            }
            succeeded++
          } catch {
            failed++
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, () => worker()))

      // Optimistic UI so the user immediately sees them as redlisted.
      setLiveRows((prev) =>
        prev.map((r) => (idsToRedlist.includes(r.id) ? { ...r, isRedlisted: true } : r)),
      )

      // Clear selection immediately (no manual reload needed).
      setSelectedIds(new Set())
      setStatuses(new Map())
      setErrors(new Map())

      if (failed === 0) {
        toast.success(`Redlistade ${succeeded} företag`)
      } else {
        toast.warning(`Redlistade ${succeeded} — ${failed} misslyckades`)
      }
    } finally {
      setRedlistRunning(false)
    }
  }

  function handleRetryFailed() {
    const failedIds = [...errors.keys()]
    setSelectedIds(new Set(failedIds))
    setStatuses(new Map())
    setErrors(new Map())
  }

  function handleClearSelection() {
    setSelectedIds(new Set())
    setStatuses(new Map())
    setErrors(new Map())
  }

  const showBar = selectedIds.size > 0 || batchRunning || statuses.size > 0

  return (
    <div className="relative">
      {/* Collapsible filter panel (opened via header button) */}
      {filtersOpen && (
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sök</label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök på namn, org.nr eller adress…"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sortera efter</label>
              <Select
                value={sortBy}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === "fetched") {
                    setSortBy("fetched")
                    setSortOrder("desc")
                  } else {
                    setSortBy(v === "org" ? "org" : v === "stage" ? "stage" : "name")
                  }
                }}
              >
                <option value="name">Namn</option>
                <option value="org">Org.nr</option>
                <option value="stage">Status</option>
                <option value="fetched">Senast hämtad</option>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Ordning</label>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value === "desc" ? "desc" : "asc")}
              >
                <option value="asc">Stigande</option>
                <option value="desc">Fallande</option>
              </Select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <Select
                value={stageFilter}
                onChange={(e) => {
                  const v = e.target.value
                  if (
                    v === "PIPELINE" ||
                    v === "SCRAPED" ||
                    v === "PROSPECT" ||
                    v === "CUSTOMER" ||
                    v === "ARCHIVED"
                  ) {
                    setStageFilter(v)
                  } else {
                    setStageFilter("all")
                  }
                }}
              >
                <option value="all">Alla</option>
                <option value="PIPELINE">Pipeline (ej kund)</option>
                <option value="SCRAPED">SCRAPED</option>
                <option value="PROSPECT">PROSPECT</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </Select>
            </div>

            <div className="sm:col-span-8">
              <label className="block text-xs font-medium text-gray-500 mb-2">Avancerat</label>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-md border border-gray-100 bg-white/60 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex items-center gap-2.5 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                    checked={onlyMissingFixedData}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setOnlyMissingFixedData(checked)
                      if (checked) setOnlyHasFetchedData(false)
                    }}
                  />
                  Saknar bolagsdata
                </label>

                <label className="flex items-center gap-2.5 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                    checked={onlyHasFetchedData}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setOnlyHasFetchedData(checked)
                      if (checked) setOnlyMissingFixedData(false)
                    }}
                  />
                  Har bolagsdata
                </label>

                <label className="flex items-center gap-2.5 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                    checked={hideRedlisted}
                    onChange={(e) => setHideRedlisted(e.target.checked)}
                  />
                  Dölj redlistade
                </label>

                <label className="flex items-center gap-2.5 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                    checked={onlyEligibleForBatch}
                    onChange={(e) => setOnlyEligibleForBatch(e.target.checked)}
                  />
                  Endast valbara (multi-fetch)
                </label>
              </div>
            </div>

            <div className="sm:col-span-12 flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-gray-500">
                Visar <span className="font-medium text-gray-700">{visibleRows.length}</span> av{" "}
                <span className="font-medium text-gray-700">{rows.length}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("")
                  setSortBy("name")
                  setSortOrder("asc")
                  setStageFilter("all")
                  setOnlyMissingFixedData(false)
                  setOnlyHasFetchedData(false)
                  setHideRedlisted(false)
                  setOnlyEligibleForBatch(false)
                }}
              >
                Återställ filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBar && (
        <div className="sticky top-0 left-0 right-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 text-sm">
            {batchRunning ? (
              <>
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-gray-700">
                  Hämtar bolagsdata... <span className="font-semibold">{processedCount}</span> av{" "}
                  <span className="font-semibold">{totalBatch}</span>
                </span>
                {completedCount > 0 && (
                  <span className="text-emerald-600 font-medium">{completedCount} klar</span>
                )}
                {failedCount > 0 && (
                  <span className="text-red-600 font-medium">{failedCount} fel</span>
                )}
              </>
            ) : statuses.size > 0 ? (
              <>
                <span className="text-gray-700">
                  Klart:{" "}
                  <span className="font-semibold text-emerald-600">{completedCount} lyckades</span>
                  {failedCount > 0 && (
                    <>
                      ,{" "}
                      <span className="font-semibold text-red-600">{failedCount} misslyckades</span>
                    </>
                  )}
                </span>
              </>
            ) : (
              <span className="text-gray-700">
                <span className="font-semibold">{selectedIds.size}</span> företag valda
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!batchRunning && statuses.size === 0 && selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runRedlistSelected()}
                disabled={redlistRunning}
              >
                {redlistRunning ? "Redlistar…" : `Redlista (${selectedIds.size})`}
              </Button>
            )}
            {!batchRunning && statuses.size > 0 && failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                <RotateCcw className="h-3.5 w-3.5" />
                Kör om misslyckade
              </Button>
            )}

            {!batchRunning && statuses.size > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                Rensa
              </Button>
            )}

            {batchRunning ? (
              <Button variant="destructive" size="sm" onClick={handleAbort}>
                <Square className="h-3.5 w-3.5" />
                Avbryt
              </Button>
            ) : statuses.size === 0 ? (
              <Button
                size="sm"
                onClick={() => void runBatch()}
                disabled={selectedIds.size === 0 || redlistRunning}
              >
                <Play className="h-3.5 w-3.5" />
                Kör ({selectedIds.size})
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <PipelineForetagTable
        pipelineId={pipelineId}
        rows={visibleRows}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onToggleAll={handleToggleAll}
        statuses={statuses}
        errors={errors}
        batchRunning={batchRunning || redlistRunning}
      />
    </div>
  )
}
