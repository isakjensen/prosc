"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "@/lib/toast"

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
      className="w-full rounded-lg border border-brand-green/35 bg-brand-green/10 px-4 py-3 text-sm text-brand-foreground sm:px-5 sm:py-4 dark:text-brand-beige"
    >
      <span className="font-medium text-brand-green">Listskrapning klar.</span>{" "}
      <span className="text-brand-foreground/90 dark:text-zinc-300">{listForetagCount} företag finns nu i listan.</span>
    </div>
  )
}
