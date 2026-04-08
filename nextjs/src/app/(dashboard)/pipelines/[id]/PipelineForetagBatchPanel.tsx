"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, Play, Square, RotateCcw } from "lucide-react"
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchRunning, setBatchRunning] = useState(false)
  const [statuses, setStatuses] = useState<Map<string, BatchStatus>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const abortRef = useRef<AbortController | null>(null)

  const eligibleRows = rows.filter(isEligibleForBatch)

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
    const idsToProcess = [...selectedIds].filter((id) =>
      rows.find((r) => r.id === id && isEligibleForBatch(r)),
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

    for (const foretagId of idsToProcess) {
      if (controller.signal.aborted) break

      setStatuses((prev) => new Map(prev).set(foretagId, "running"))

      try {
        const res = await fetch(
          `/api/pipelines/${pipelineId}/foretag/${foretagId}/fetch-detail`,
          {
            method: "POST",
            signal: controller.signal,
          },
        )

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }

        setStatuses((prev) => new Map(prev).set(foretagId, "success"))
        succeeded++
      } catch (e) {
        if (controller.signal.aborted) {
          setStatuses((prev) => new Map(prev).set(foretagId, "pending"))
          break
        }
        const msg = e instanceof Error ? e.message : "Okänt fel"
        setStatuses((prev) => new Map(prev).set(foretagId, "error"))
        setErrors((prev) => new Map(prev).set(foretagId, msg))
        failed++
      }
    }

    setBatchRunning(false)
    abortRef.current = null
    router.refresh()

    if (controller.signal.aborted) {
      toast.info(`Batch avbruten — ${succeeded} lyckades, ${failed} misslyckades`)
    } else if (failed === 0) {
      toast.success(`Alla ${succeeded} företag hämtades`)
    } else {
      toast.warning(`${succeeded} lyckades, ${failed} misslyckades`)
    }
  }

  function handleAbort() {
    abortRef.current?.abort()
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
      <PipelineForetagTable
        pipelineId={pipelineId}
        rows={rows}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onToggleAll={handleToggleAll}
        statuses={statuses}
        errors={errors}
        batchRunning={batchRunning}
      />

      {showBar && (
        <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
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
                      , <span className="font-semibold text-red-600">{failedCount} misslyckades</span>
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
            {!batchRunning && statuses.size > 0 && failedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryFailed}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Kör om misslyckade
              </Button>
            )}

            {!batchRunning && statuses.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
              >
                Rensa
              </Button>
            )}

            {batchRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleAbort}
              >
                <Square className="h-3.5 w-3.5" />
                Avbryt
              </Button>
            ) : statuses.size === 0 ? (
              <Button
                size="sm"
                onClick={() => void runBatch()}
                disabled={selectedIds.size === 0}
              >
                <Play className="h-3.5 w-3.5" />
                Kör ({selectedIds.size})
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
