"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

/**
 * Visas när listskrapningen går från RUNNING till COMPLETED (upptäcks via router.refresh-pollning).
 */
export default function PipelineScrapeCompleteBanner({
  status,
  listForetagCount,
}: {
  status: string
  /** Antal företagsrader i pipelinen efter listskrapning (uppdateras vid refresh). */
  listForetagCount: number
}) {
  const prevStatus = useRef<string | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (prevStatus.current === "RUNNING" && status === "COMPLETED") {
      setShow(true)
      toast.success(`Listskrapning klar — ${listForetagCount} företag hämtades.`)
    }
    prevStatus.current = status
  }, [status, listForetagCount])

  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 sm:px-5 sm:py-4"
    >
      <span className="font-medium text-emerald-900">Listskrapning klar.</span>{" "}
      <span className="text-emerald-800">{listForetagCount} företag finns nu i listan.</span>
    </div>
  )
}
