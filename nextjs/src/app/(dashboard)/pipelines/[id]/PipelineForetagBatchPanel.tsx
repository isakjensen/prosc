"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useConfirm } from "@/components/confirm/ConfirmProvider"
import { Button } from "@/components/ui/button"
import { Loader2, Play, Square, RotateCcw, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import PipelineForetagTable, {
  type PipelineForetagRow,
  type BatchStatus,
  isEligibleForBatch,
  canQueueDetailFetch,
  canQueueWebsiteScan,
  rowNeedsDetailScrape,
  rowMissingWebsite,
} from "./PipelineForetagTable"

interface Props {
  pipelineId: string
  pipelineStatus: string
  /** Totalt antal företagsrader i pipelinen (kan växa under listskrapning). */
  listForetagTotal: number
  rows: PipelineForetagRow[]
}

export default function PipelineForetagBatchPanel({
  pipelineId,
  pipelineStatus,
  listForetagTotal,
  rows,
}: Props) {
  const confirm = useConfirm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const filtersOpen = mounted && searchParams.get("filters") === "1"

  const [liveRows, setLiveRows] = useState<PipelineForetagRow[]>(rows)
  const [liveListTotal, setLiveListTotal] = useState(listForetagTotal)

  useEffect(() => setLiveRows(rows), [rows])
  useEffect(() => setLiveListTotal(listForetagTotal), [listForetagTotal])

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
  const [siteBatchRunning, setSiteBatchRunning] = useState(false)
  const [siteStatuses, setSiteStatuses] = useState<Map<string, BatchStatus>>(new Map())
  const [siteErrors, setSiteErrors] = useState<Map<string, string>>(new Map())
  const siteAbortRef = useRef<AbortController | null>(null)
  const [redlistRunning, setRedlistRunning] = useState(false)
  /** En-rads webbsökning från Åtgärder (påverkar BF-data-kolumnens laddningstext). */
  const [soloWebsiteRowIds, setSoloWebsiteRowIds] = useState<Set<string>>(new Set())

  const hasActiveDetailJobs = liveRows.some(
    (r) => r.detailStatus === "QUEUED" || r.detailStatus === "RUNNING",
  )

  useEffect(() => {
    const pollListScrape = pipelineStatus === "RUNNING"
    if (!hasActiveDetailJobs && !batchRunning && !siteBatchRunning && !pollListScrape) return

    function poll() {
      fetch(`/api/pipelines/${pipelineId}/companies`)
        .then((r) => r.json())
        .then((data: { rows?: PipelineForetagRow[]; totalCount?: number }) => {
          if (Array.isArray(data?.rows)) {
            setLiveRows(data.rows)
          }
          if (typeof data?.totalCount === "number") {
            setLiveListTotal(data.totalCount)
          }
        })
        .catch(() => {})
    }

    poll()
    const id = window.setInterval(poll, 1500)

    return () => window.clearInterval(id)
  }, [pipelineId, pipelineStatus, hasActiveDetailJobs, batchRunning, siteBatchRunning])

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
      const hay = `${r.namn ?? ""} ${r.orgNummer ?? ""} ${r.adress ?? ""} ${r.website ?? ""}`.toLowerCase()
      return hay.includes(q)
    })

    filtered.sort((a, b) => {
      const redCmp = Number(a.isRedlisted) - Number(b.isRedlisted)
      if (redCmp !== 0) return redCmp

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

  const queueableRows = useMemo(() => visibleRows.filter(canQueueDetailFetch), [visibleRows])
  const queueableMissingRows = useMemo(
    () => queueableRows.filter(rowNeedsDetailScrape),
    [queueableRows],
  )

  const websiteScanQueueableRows = useMemo(
    () => visibleRows.filter(canQueueWebsiteScan),
    [visibleRows],
  )

  const websiteMissingQueueableRows = useMemo(
    () => websiteScanQueueableRows.filter(rowMissingWebsite),
    [websiteScanQueueableRows],
  )

  const completedCount = [...statuses.values()].filter((s) => s === "success").length
  const failedCount = [...statuses.values()].filter((s) => s === "error").length
  const totalBatch = [...statuses.values()].length
  const processedCount = completedCount + failedCount

  const siteCompletedCount = [...siteStatuses.values()].filter((s) => s === "success").length
  const siteFailedCount = [...siteStatuses.values()].filter((s) => s === "error").length
  const siteTotalBatch = [...siteStatuses.values()].length
  const siteProcessedCount = siteCompletedCount + siteFailedCount

  const websiteBfLoadingByRow = useMemo(() => {
    const m = new Map<string, "pending" | "running">()
    for (const [id, st] of siteStatuses) {
      if (st === "pending") m.set(id, "pending")
      else if (st === "running") m.set(id, "running")
    }
    for (const id of soloWebsiteRowIds) {
      if (!m.has(id)) m.set(id, "running")
    }
    return m
  }, [siteStatuses, soloWebsiteRowIds])

  const onSoloWebsiteDiscoverLoading = useCallback((foretagId: string, loading: boolean) => {
    setSoloWebsiteRowIds((prev) => {
      const next = new Set(prev)
      if (loading) next.add(foretagId)
      else next.delete(foretagId)
      return next
    })
  }, [])

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

  async function runBatch(mode?: "selection" | "missing" | "all") {
    function sleep(ms: number) {
      return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
    }

    setSiteStatuses(new Map())
    setSiteErrors(new Map())
    setSoloWebsiteRowIds(new Set())

    let idsToProcess: string[]
    if (mode === "missing") {
      idsToProcess = queueableMissingRows.map((r) => r.id)
    } else if (mode === "all") {
      idsToProcess = queueableRows.map((r) => r.id)
    } else {
      idsToProcess = [...selectedIds].filter((id) =>
        liveRows.find((r) => r.id === id && canQueueDetailFetch(r)),
      )
    }

    idsToProcess = idsToProcess.filter((id) =>
      liveRows.some((r) => r.id === id && canQueueDetailFetch(r)),
    )

    if (idsToProcess.length === 0) {
      if (mode === "missing") {
        toast.info("Inga oskrapade företag i den synliga listan (eller alla köas redan).")
      } else if (mode === "all") {
        toast.info("Inga valbara företag i den synliga listan (eller alla köas redan).")
      }
      return
    }

    if (mode === "missing" || mode === "all") {
      setSelectedIds(new Set(idsToProcess))
      setStatuses(new Map())
      setErrors(new Map())
    }

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

  async function runWebsiteBatch(mode?: "selection" | "missing") {
    function sleep(ms: number) {
      return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
    }

    setStatuses(new Map())
    setErrors(new Map())
    setSoloWebsiteRowIds(new Set())

    let idsToProcess: string[]
    if (mode === "missing") {
      idsToProcess = websiteMissingQueueableRows.map((r) => r.id)
    } else {
      idsToProcess = [...selectedIds].filter((id) =>
        liveRows.some((r) => r.id === id && canQueueWebsiteScan(r)),
      )
    }

    idsToProcess = idsToProcess.filter((id) =>
      liveRows.some((r) => r.id === id && canQueueWebsiteScan(r)),
    )

    if (idsToProcess.length === 0) {
      if (mode === "missing") {
        toast.info("Inga företag i den synliga listan saknar webbplats (eller detaljjobb köas redan).")
      } else {
        toast.info("Välj företag som kan skannas, eller använd knappen för saknad webbplats.")
      }
      return
    }

    if (mode === "missing") {
      setSelectedIds(new Set(idsToProcess))
    }

    const controller = new AbortController()
    siteAbortRef.current = controller
    setSiteBatchRunning(true)

    const initialStatuses = new Map<string, BatchStatus>()
    for (const id of idsToProcess) {
      initialStatuses.set(id, "pending")
    }
    setSiteStatuses(initialStatuses)
    setSiteErrors(new Map())

    let succeeded = 0
    let failed = 0
    let foundWebsite = 0

    const concurrency = 2
    const queue = [...idsToProcess]

    async function worker() {
      while (!controller.signal.aborted) {
        const foretagId = queue.shift()
        if (!foretagId) return

        setSiteStatuses((prev) => new Map(prev).set(foretagId, "running"))

        try {
          await sleep(400 + Math.floor(Math.random() * 600))

          const res = await fetch(
            `/api/pipelines/${pipelineId}/companies/${foretagId}/discover-website`,
            { method: "POST", signal: controller.signal },
          )

          const body = (await res.json().catch(() => ({}))) as {
            error?: string
            websiteDiscovery?: { enrichment?: { website?: string | null } | null } | null
          }

          if (!res.ok) {
            throw new Error(body.error ?? `HTTP ${res.status}`)
          }

          const web = body.websiteDiscovery?.enrichment?.website?.trim()
          if (web) foundWebsite++

          setSiteStatuses((prev) => new Map(prev).set(foretagId, "success"))
          setSelectedIds((prev) => {
            if (!prev.has(foretagId)) return prev
            const next = new Set(prev)
            next.delete(foretagId)
            return next
          })
          succeeded++
        } catch (e) {
          if (controller.signal.aborted) {
            setSiteStatuses((prev) => new Map(prev).set(foretagId, "pending"))
            return
          }
          const msg = e instanceof Error ? e.message : "Okänt fel"
          setSiteStatuses((prev) => new Map(prev).set(foretagId, "error"))
          setSiteErrors((prev) => new Map(prev).set(foretagId, msg))
          failed++
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    setSiteBatchRunning(false)
    siteAbortRef.current = null
    router.refresh()

    if (controller.signal.aborted) {
      toast.info(`Webbplats-sökning avbruten — ${succeeded} klara, ${failed} misslyckades`)
    } else if (failed === 0) {
      toast.success(
        `Webbplats-sökning klar: ${succeeded} företag. Hittade webb för ${foundWebsite} av ${succeeded}.`,
      )
    } else {
      toast.warning(
        `Webbplats-sökning: ${succeeded} klara (${foundWebsite} med ny webb), ${failed} misslyckades`,
      )
    }
  }

  function handleAbort() {
    abortRef.current?.abort()
  }

  function handleAbortWebsite() {
    siteAbortRef.current?.abort()
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

    const ok = await confirm({
      title: "Redlista markerade företag?",
      description: `Redlista ${idsToRedlist.length} markerade företag? Detta påverkar vilka företag som kan hämtas.`,
      confirmLabel: "Redlista",
      cancelLabel: "Avbryt",
      variant: "danger",
    })
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
      setSiteStatuses(new Map())
      setSiteErrors(new Map())
      setSoloWebsiteRowIds(new Set())

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
    setSiteStatuses(new Map())
    setSiteErrors(new Map())
    setSoloWebsiteRowIds(new Set())
  }

  function handleRetrySiteFailed() {
    const failedIds = [...siteErrors.keys()]
    setSelectedIds(new Set(failedIds))
    setSiteStatuses(new Map())
    setSiteErrors(new Map())
    setStatuses(new Map())
    setErrors(new Map())
    setSoloWebsiteRowIds(new Set())
  }

  function handleClearSelection() {
    setSelectedIds(new Set())
    setStatuses(new Map())
    setErrors(new Map())
    setSiteStatuses(new Map())
    setSiteErrors(new Map())
    setSoloWebsiteRowIds(new Set())
  }

  const showBar =
    selectedIds.size > 0 ||
    batchRunning ||
    statuses.size > 0 ||
    siteBatchRunning ||
    siteStatuses.size > 0

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600 max-w-xl leading-snug">
            <span className="font-medium text-gray-800">Masshämta bolagsdata</span> — gäller den{" "}
            <strong>synliga</strong> listan (filter/sök). Oskrapade = saknar data eller senaste körning
            misslyckades. Alla valbara = inkluderar redan skrapade (för omhämtning).
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                batchRunning || siteBatchRunning || redlistRunning || queueableMissingRows.length === 0
              }
              onClick={() => void runBatch("missing")}
            >
              Endast oskrapade ({queueableMissingRows.length})
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={batchRunning || siteBatchRunning || redlistRunning || queueableRows.length === 0}
              onClick={() => void runBatch("all")}
            >
              Alla valbara ({queueableRows.length})
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600 max-w-xl leading-snug">
            <span className="font-medium text-gray-800">Webbplats-sökning</span> — kör samma
            Bolagsfakta-detaljskrapning som uppdaterar webb/e-post/telefon via Google + AI. Gäller den{" "}
            <strong>synliga</strong> listan. Använd markerade rader i verktygsraden nedan, eller kör för alla
            som saknar webb här.
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                batchRunning ||
                siteBatchRunning ||
                redlistRunning ||
                websiteMissingQueueableRows.length === 0
              }
              onClick={() => void runWebsiteBatch("missing")}
            >
              <Globe className="h-3.5 w-3.5" />
              Saknar webbplats ({websiteMissingQueueableRows.length})
            </Button>
          </div>
        </div>
      </div>

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
                <span className="font-medium text-gray-700 tabular-nums">{liveListTotal}</span>
                {pipelineStatus === "RUNNING" ? (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-700">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Uppdateras…
                  </span>
                ) : null}
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
        <div className="sticky top-0 left-0 right-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 text-sm min-w-0">
            {batchRunning ? (
              <>
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
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
            ) : siteBatchRunning ? (
              <>
                <Loader2 className="h-4 w-4 text-violet-500 animate-spin shrink-0" />
                <span className="text-gray-700">
                  Skannar webbplatser... <span className="font-semibold">{siteProcessedCount}</span> av{" "}
                  <span className="font-semibold">{siteTotalBatch}</span>
                </span>
                {siteCompletedCount > 0 && (
                  <span className="text-emerald-600 font-medium">{siteCompletedCount} klar</span>
                )}
                {siteFailedCount > 0 && (
                  <span className="text-red-600 font-medium">{siteFailedCount} fel</span>
                )}
              </>
            ) : statuses.size > 0 ? (
              <span className="text-gray-700">
                Bolagsdata klar:{" "}
                <span className="font-semibold text-emerald-600">{completedCount} lyckades</span>
                {failedCount > 0 && (
                  <>
                    , <span className="font-semibold text-red-600">{failedCount} misslyckades</span>
                  </>
                )}
              </span>
            ) : siteStatuses.size > 0 ? (
              <span className="text-gray-700">
                Webbplats-sökning klar:{" "}
                <span className="font-semibold text-emerald-600">{siteCompletedCount} lyckades</span>
                {siteFailedCount > 0 && (
                  <>
                    , <span className="font-semibold text-red-600">{siteFailedCount} misslyckades</span>
                  </>
                )}
              </span>
            ) : (
              <span className="text-gray-700">
                <span className="font-semibold">{selectedIds.size}</span> företag valda
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!batchRunning &&
              !siteBatchRunning &&
              statuses.size === 0 &&
              siteStatuses.size === 0 &&
              selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runRedlistSelected()}
                  disabled={redlistRunning}
                >
                  {redlistRunning ? "Redlistar…" : `Redlista (${selectedIds.size})`}
                </Button>
              )}
            {!batchRunning && !siteBatchRunning && statuses.size > 0 && failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                <RotateCcw className="h-3.5 w-3.5" />
                Kör om bolagsdata
              </Button>
            )}

            {!batchRunning && !siteBatchRunning && siteStatuses.size > 0 && siteFailedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleRetrySiteFailed}>
                <RotateCcw className="h-3.5 w-3.5" />
                Kör om webbsökning
              </Button>
            )}

            {!batchRunning && !siteBatchRunning && (statuses.size > 0 || siteStatuses.size > 0) && (
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                Rensa
              </Button>
            )}

            {batchRunning ? (
              <Button variant="destructive" size="sm" onClick={handleAbort}>
                <Square className="h-3.5 w-3.5" />
                Avbryt
              </Button>
            ) : siteBatchRunning ? (
              <Button variant="destructive" size="sm" onClick={handleAbortWebsite}>
                <Square className="h-3.5 w-3.5" />
                Avbryt
              </Button>
            ) : statuses.size === 0 && siteStatuses.size === 0 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void runWebsiteBatch()}
                  disabled={selectedIds.size === 0 || redlistRunning}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Skanna webb ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  onClick={() => void runBatch()}
                  disabled={selectedIds.size === 0 || redlistRunning}
                >
                  <Play className="h-3.5 w-3.5" />
                  Kör bolagsdata ({selectedIds.size})
                </Button>
              </>
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
        batchRunning={batchRunning || redlistRunning || siteBatchRunning}
        siteStatuses={siteStatuses}
        siteErrors={siteErrors}
        siteBatchRunning={siteBatchRunning}
        websiteBfLoadingByRow={websiteBfLoadingByRow}
        onSoloWebsiteDiscoverLoading={onSoloWebsiteDiscoverLoading}
      />
    </div>
  )
}
