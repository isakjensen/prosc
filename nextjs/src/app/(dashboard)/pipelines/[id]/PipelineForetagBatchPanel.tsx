"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/lib/toast"
import { useConfirm } from "@/components/confirm/ConfirmProvider"
import { Button } from "@/components/ui/button"
import { Loader2, Play, Square, RotateCcw, Globe, Search, X, Sparkles } from "lucide-react"
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

function parseNumeric(s: string | null | undefined): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""))
  return isNaN(n) ? null : n
}

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
  const [sortBy, setSortBy] = useState<"name" | "org" | "stage" | "fetched" | "omsattning" | "ebitda">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [stageFilter, setStageFilter] = useState<
    "all" | "PIPELINE" | "SCRAPED" | "PROSPECT" | "CUSTOMER" | "ARCHIVED"
  >("all")
  const [onlyMissingFixedData, setOnlyMissingFixedData] = useState(false)
  const [onlyHasFetchedData, setOnlyHasFetchedData] = useState(false)
  const [hideRedlisted, setHideRedlisted] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
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

  // -- Batch website discovery (AI agent, groups of 10) --
  const [batchWebDiscoveryRunning, setBatchWebDiscoveryRunning] = useState(false)
  const [batchWebDiscoveryProgress, setBatchWebDiscoveryProgress] = useState<{
    totalCompanies: number
    totalBatches: number
    completedBatches: number
    foundWebsites: number
  } | null>(null)
  const batchWebPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      if (!showHidden && r.isHidden) return false
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
      } else if (sortBy === "omsattning" || sortBy === "ebitda") {
        const aV = parseNumeric(a[sortBy])
        const bV = parseNumeric(b[sortBy])
        if (aV === null && bV === null) cmp = 0
        else if (aV === null) return 1
        else if (bV === null) return -1
        else cmp = aV - bV
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
    showHidden,
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

  const missingWebsiteCount = useMemo(
    () => liveRows.filter((r) => !r.isRedlisted && r.customerId && !r.website?.trim()).length,
    [liveRows],
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

    // Return to "normal" state after a run so user can re-run immediately.
    // (We still show the toast summary for feedback.)
    setSiteStatuses(new Map())
    setSiteErrors(new Map())

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

  async function runFilterSelected() {
    const selected = [...selectedIds]
    if (selected.length === 0) return

    const idsToFilter = selected.filter((id) => {
      const r = liveRows.find((row) => row.id === id)
      return r && !r.isRedlisted
    })

    if (idsToFilter.length === 0) {
      toast.info("Alla markerade företag är redan filtrerade")
      return
    }

    const ok = await confirm({
      title: "Filtrera markerade företag?",
      description: `Filtrera ${idsToFilter.length} markerade företag? De kommer inte längre hämtas eller tas vidare.`,
      confirmLabel: "Filtrera",
      cancelLabel: "Avbryt",
      variant: "danger",
    })
    if (!ok) return

    setRedlistRunning(true)
    try {
      let succeeded = 0
      let failed = 0

      const concurrency = 5
      const queue = [...idsToFilter]

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

      setLiveRows((prev) =>
        prev.map((r) => (idsToFilter.includes(r.id) ? { ...r, isRedlisted: true } : r)),
      )

      setSelectedIds(new Set())
      setStatuses(new Map())
      setErrors(new Map())
      setSiteStatuses(new Map())
      setSiteErrors(new Map())
      setSoloWebsiteRowIds(new Set())

      if (failed === 0) {
        toast.success(`Filtrerade ${succeeded} företag`)
      } else {
        toast.warning(`Filtrerade ${succeeded} — ${failed} misslyckades`)
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

  async function startBatchWebDiscovery() {
    setBatchWebDiscoveryRunning(true)
    setBatchWebDiscoveryProgress(null)
    setSelectedIds(new Set())
    setStatuses(new Map())
    setErrors(new Map())
    setSiteStatuses(new Map())
    setSiteErrors(new Map())
    setSoloWebsiteRowIds(new Set())

    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/discover-websites`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        totalCompanies?: number
        totalBatches?: number
        message?: string
      }

      if (!res.ok) {
        toast.error(body.error ?? `HTTP ${res.status}`)
        setBatchWebDiscoveryRunning(false)
        return
      }

      if (body.totalCompanies === 0) {
        toast.info(body.message ?? "Alla företag har redan en webbplats.")
        setBatchWebDiscoveryRunning(false)
        return
      }

      setBatchWebDiscoveryProgress({
        totalCompanies: body.totalCompanies ?? 0,
        totalBatches: body.totalBatches ?? 0,
        completedBatches: 0,
        foundWebsites: 0,
      })

      toast.success(`Webbplatssökning startad — ${body.totalCompanies} företag i ${body.totalBatches} grupper`)

      if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
      batchWebPollRef.current = setInterval(() => void pollBatchWebProgress(), 3000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte starta webbplatssökning")
      setBatchWebDiscoveryRunning(false)
    }
  }

  async function stopBatchWebDiscovery() {
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/discover-websites/stop`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        toast.error(body.error ?? "Kunde inte stoppa webbplatssökningen")
        return
      }

      if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
      batchWebPollRef.current = null
      setBatchWebDiscoveryRunning(false)
      setBatchWebDiscoveryProgress(null)
      toast.info("Webbplatssökning stoppad")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte stoppa webbplatssökningen")
    }
  }

  async function pollBatchWebProgress() {
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/discover-websites`)
      const body = (await res.json().catch(() => ({}))) as {
        status?: string
        progress?: {
          totalCompanies?: number
          totalBatches?: number
          completedBatches?: number
          foundWebsites?: number
        }
        result?: {
          totalCompanies?: number
          foundWebsites?: number
          errors?: number
        }
        error?: string
      }

      if (body.status === "running" && body.progress) {
        setBatchWebDiscoveryProgress({
          totalCompanies: body.progress.totalCompanies ?? 0,
          totalBatches: body.progress.totalBatches ?? 0,
          completedBatches: body.progress.completedBatches ?? 0,
          foundWebsites: body.progress.foundWebsites ?? 0,
        })
      } else if (body.status === "completed") {
        if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
        batchWebPollRef.current = null
        setBatchWebDiscoveryRunning(false)

        const found = body.result?.foundWebsites ?? 0
        const total = body.result?.totalCompanies ?? 0
        const errs = body.result?.errors ?? 0

        if (errs > 0) {
          toast.warning(`Webbplatssökning klar: ${found} av ${total} hittade, ${errs} fel`)
        } else {
          toast.success(`Webbplatssökning klar: ${found} av ${total} webbplatser hittade`)
        }
        setBatchWebDiscoveryProgress(null)
        router.refresh()
      } else if (body.status === "failed") {
        if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
        batchWebPollRef.current = null
        setBatchWebDiscoveryRunning(false)
        toast.error(`Webbplatssökning misslyckades: ${body.error ?? "Okänt fel"}`)
        setBatchWebDiscoveryProgress(null)
      } else if (body.status === "idle") {
        if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
        batchWebPollRef.current = null
        setBatchWebDiscoveryRunning(false)
        setBatchWebDiscoveryProgress(null)
      }
    } catch {
      /* ignore poll errors */
    }
  }

  useEffect(() => {
    return () => {
      if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}/discover-websites`)
        const body = (await res.json().catch(() => ({}))) as {
          status?: string
          progress?: {
            totalCompanies?: number
            totalBatches?: number
            completedBatches?: number
            foundWebsites?: number
          }
        }
        if (body.status === "running" && body.progress) {
          setBatchWebDiscoveryRunning(true)
          setBatchWebDiscoveryProgress({
            totalCompanies: body.progress.totalCompanies ?? 0,
            totalBatches: body.progress.totalBatches ?? 0,
            completedBatches: body.progress.completedBatches ?? 0,
            foundWebsites: body.progress.foundWebsites ?? 0,
          })
          if (batchWebPollRef.current) clearInterval(batchWebPollRef.current)
          batchWebPollRef.current = setInterval(() => void pollBatchWebProgress(), 3000)
        }
      } catch {
        /* ignore */
      }
    })()
  }, [pipelineId])

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
      {/* Always-visible toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 dark:border-zinc-800 dark:bg-zinc-800/40 px-4 py-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[10rem] max-w-[18rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök namn, org.nr…"
            className="pl-8 h-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-gray-200 shrink-0" />

        {/* Batch data actions */}
        <span className="text-xs font-medium text-gray-400 shrink-0">Hämta data</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={batchRunning || siteBatchRunning || redlistRunning || queueableMissingRows.length === 0}
          onClick={() => void runBatch("missing")}
        >
          Saknade ({queueableMissingRows.length})
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={batchRunning || siteBatchRunning || redlistRunning || queueableRows.length === 0}
          onClick={() => void runBatch("all")}
        >
          Alla ({queueableRows.length})
        </Button>

        {/* "Sök webb"-knappen dold */}

        {/* AI batch website discovery — tillfälligt inaktiverad */}
        {/* <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={
            batchRunning ||
            siteBatchRunning ||
            redlistRunning ||
            batchWebDiscoveryRunning ||
            missingWebsiteCount === 0
          }
          onClick={() => void startBatchWebDiscovery()}
        >
          {batchWebDiscoveryRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {batchWebDiscoveryRunning ? "Söker…" : `Hämta webbplatser (${missingWebsiteCount})`}
        </Button> */}

        {/* Row count */}
        <span className="ml-auto text-xs text-gray-400 shrink-0 tabular-nums">
          {visibleRows.length !== liveListTotal ? (
            <>{visibleRows.length} av {liveListTotal.toLocaleString('sv')}</>
          ) : (
            <>{liveListTotal.toLocaleString('sv')} företag</>
          )}
          {pipelineStatus === "RUNNING" && (
            <Loader2 className="inline ml-1.5 h-3 w-3 animate-spin text-brand-green" aria-hidden />
          )}
        </span>
      </div>

      {/* Collapsible filter panel (opened via header button) */}
      {filtersOpen && (
        <div className="border-b border-gray-200 dark:border-zinc-700/80 bg-gray-100/80 dark:bg-zinc-900/80 px-6 py-5">
          <div className="flex flex-wrap items-end justify-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-zinc-300 mb-1">Sortera efter</label>
              <Select
                value={sortBy}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === "fetched" || v === "omsattning" || v === "ebitda") {
                    setSortBy(v)
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
                <option value="omsattning">Omsättning</option>
                <option value="ebitda">EBITDA</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-zinc-300 mb-1">Ordning</label>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value === "desc" ? "desc" : "asc")}
              >
                <option value="asc">Stigande</option>
                <option value="desc">Fallande</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-zinc-300 mb-1">CRM-status</label>
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
                <option value="all">Alla statusar</option>
                <option value="PIPELINE">Ej kund</option>
                <option value="SCRAPED">Scrapad</option>
                <option value="PROSPECT">Prospect</option>
                <option value="CUSTOMER">Kund</option>
                <option value="ARCHIVED">Arkiverad</option>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200 select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                checked={onlyMissingFixedData}
                onChange={(e) => {
                  const checked = e.target.checked
                  setOnlyMissingFixedData(checked)
                  if (checked) setOnlyHasFetchedData(false)
                }}
              />
              Saknar bolagsdata
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200 select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                checked={onlyHasFetchedData}
                onChange={(e) => {
                  const checked = e.target.checked
                  setOnlyHasFetchedData(checked)
                  if (checked) setOnlyMissingFixedData(false)
                }}
              />
              Har bolagsdata
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200 select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                checked={hideRedlisted}
                onChange={(e) => setHideRedlisted(e.target.checked)}
              />
              Dölj filtrerade
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200 select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              Visa dolda
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200 select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 text-zinc-800 focus:ring-zinc-500 cursor-pointer"
                checked={onlyEligibleForBatch}
                onChange={(e) => setOnlyEligibleForBatch(e.target.checked)}
              />
              Valbara för batch
            </label>
          </div>

          <div className="mt-3 flex justify-center">
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
                setShowHidden(false)
                setOnlyEligibleForBatch(false)
              }}
            >
              Återställ
            </Button>
          </div>
        </div>
      )}

      {batchWebDiscoveryRunning && batchWebDiscoveryProgress && (
        <div className="border-b border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/30 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-indigo-900 dark:text-indigo-100">
                AI söker webbplatser
                <span className="ml-2 font-semibold tabular-nums">
                  {batchWebDiscoveryProgress.completedBatches}/{batchWebDiscoveryProgress.totalBatches} grupper
                </span>
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-300 tabular-nums">
                {batchWebDiscoveryProgress.totalCompanies} företag totalt — {batchWebDiscoveryProgress.foundWebsites} webbplatser hittade hittills
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${batchWebDiscoveryProgress.totalBatches > 0
                    ? (batchWebDiscoveryProgress.completedBatches / batchWebDiscoveryProgress.totalBatches) * 100
                    : 0}%`,
                }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-indigo-600 dark:text-indigo-300 w-10 text-right">
              {batchWebDiscoveryProgress.totalBatches > 0
                ? Math.round((batchWebDiscoveryProgress.completedBatches / batchWebDiscoveryProgress.totalBatches) * 100)
                : 0}%
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void stopBatchWebDiscovery()}
            >
              <Square className="h-3.5 w-3.5" />
              Stoppa
            </Button>
          </div>
        </div>
      )}

      {showBar && (
        <div className="sticky top-0 left-0 right-0 z-10 border-b border-gray-200 dark:border-zinc-700 bg-white/96 dark:bg-zinc-900/96 backdrop-blur-sm px-5 py-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            {batchRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-brand-brown animate-spin shrink-0" />
                <span className="text-gray-700 dark:text-zinc-300">
                  Hämtar bolagsdata
                  <span className="ml-1.5 font-semibold tabular-nums">{processedCount}/{totalBatch}</span>
                </span>
                {completedCount > 0 && (
                  <span className="text-brand-green text-xs font-medium">✓ {completedCount}</span>
                )}
                {failedCount > 0 && (
                  <span className="text-red-600 text-xs font-medium">✗ {failedCount}</span>
                )}
              </>
            ) : siteBatchRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-brand-brown animate-spin shrink-0" />
                <span className="text-gray-700 dark:text-zinc-300">
                  Skannar webbplatser
                  <span className="ml-1.5 font-semibold tabular-nums">{siteProcessedCount}/{siteTotalBatch}</span>
                </span>
                {siteCompletedCount > 0 && (
                  <span className="text-brand-green text-xs font-medium">✓ {siteCompletedCount}</span>
                )}
                {siteFailedCount > 0 && (
                  <span className="text-red-600 text-xs font-medium">✗ {siteFailedCount}</span>
                )}
              </>
            ) : statuses.size > 0 ? (
              <span className="text-gray-700 dark:text-zinc-300">
                Klar: <span className="font-semibold text-brand-green">{completedCount} lyckades</span>
                {failedCount > 0 && <span className="font-semibold text-red-600 ml-1">, {failedCount} fel</span>}
              </span>
            ) : siteStatuses.size > 0 ? (
              <span className="text-gray-700 dark:text-zinc-300">
                Webb-sökning klar: <span className="font-semibold text-brand-green">{siteCompletedCount} lyckades</span>
                {siteFailedCount > 0 && <span className="font-semibold text-red-600 ml-1">, {siteFailedCount} fel</span>}
              </span>
            ) : (
              <span className="text-gray-700 dark:text-zinc-300">
                <span className="font-semibold">{selectedIds.size}</span> valda
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!batchRunning && !siteBatchRunning && statuses.size === 0 && siteStatuses.size === 0 && selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => void runFilterSelected()} disabled={redlistRunning}>
                {redlistRunning ? "Filtrerar…" : `Filtrera (${selectedIds.size})`}
              </Button>
            )}
            {!batchRunning && !siteBatchRunning && statuses.size > 0 && failedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                <RotateCcw className="h-3.5 w-3.5" />
                Kör om
              </Button>
            )}
            {!batchRunning && !siteBatchRunning && siteStatuses.size > 0 && siteFailedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleRetrySiteFailed}>
                <RotateCcw className="h-3.5 w-3.5" />
                Kör om
              </Button>
            )}
            {!batchRunning && !siteBatchRunning && (statuses.size > 0 || siteStatuses.size > 0) && (
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>Rensa</Button>
            )}

            {batchRunning ? (
              <Button variant="destructive" size="sm" onClick={handleAbort}>
                <Square className="h-3.5 w-3.5" />
                Avbryt
              </Button>
            ) : siteBatchRunning ? (
              <Button variant="outline" size="sm" onClick={handleAbortWebsite}>
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
                  Hämta data ({selectedIds.size})
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
