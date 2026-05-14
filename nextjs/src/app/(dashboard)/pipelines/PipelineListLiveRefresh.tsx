"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PipelineListLiveRefresh({ hasRunning }: { hasRunning: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!hasRunning) return

    const id = window.setInterval(() => {
      router.refresh()
    }, 3000)

    return () => window.clearInterval(id)
  }, [hasRunning, router])

  return null
}
