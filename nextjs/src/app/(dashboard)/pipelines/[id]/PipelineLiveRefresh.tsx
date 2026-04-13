"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Medan pipeline har status RUNNING uppdateras sidan regelbundet så att nya
 * scrapade företag syns i listan utan att användaren behöver ladda om manuellt.
 */
export default function PipelineLiveRefresh({
  status,
  hasActiveDetailJobs,
}: {
  status: string
  hasActiveDetailJobs: boolean
}) {
  const router = useRouter()
  const intervalMs = 2000

  useEffect(() => {
    if (status !== "RUNNING" && !hasActiveDetailJobs) return

    const id = window.setInterval(() => {
      router.refresh()
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [status, hasActiveDetailJobs, router])

  return null
}
