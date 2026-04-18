"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * Live-uppdatering av antal företag i listan medan pipeline-listskrapning (RUNNING) pågår.
 */
export default function PipelineForetagPanelHeading({
  pipelineId,
  initialTotalCount,
  pipelineStatus,
}: {
  pipelineId: string
  initialTotalCount: number
  pipelineStatus: string
}) {
  const [count, setCount] = useState(initialTotalCount)

  useEffect(() => {
    setCount(initialTotalCount)
  }, [initialTotalCount])

  useEffect(() => {
    if (pipelineStatus !== "RUNNING") return

    const tick = () => {
      fetch(`/api/pipelines/${pipelineId}/companies`)
        .then((r) => r.json())
        .then((data: { totalCount?: number }) => {
          if (typeof data?.totalCount === "number") setCount(data.totalCount)
        })
        .catch(() => {})
    }

    tick()
    const id = window.setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [pipelineId, pipelineStatus])

  return (
    <h2 className="text-sm font-semibold text-gray-900 inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        Företag (<span className="tabular-nums">{count}</span>)
      </span>
      {pipelineStatus === "RUNNING" ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-emerald-700">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          Listskrapning…
        </span>
      ) : null}
    </h2>
  )
}
