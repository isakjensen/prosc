"use client"

import { showWebsiteDiscoveryToasts } from "@/components/bolagsfakta/showWebsiteDiscoveryToasts"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

type BolagsfaktaRefreshButtonProps = {
  customerId: string
  /** Default: "Uppdatera från Bolagsfakta" — use a fetch-oriented label when BF-data is missing. */
  label?: string
}

export default function BolagsfaktaRefreshButton({ customerId, label }: BolagsfaktaRefreshButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/kunder/${customerId}/bolagsfakta/refresh`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        websiteDiscovery?: WebsiteDiscoveryResult | null
      }
      if (!res.ok) {
        setError(body.error ?? "Kunde inte uppdatera")
        return
      }
      toast.success("Bolagsfakta uppdaterad")
      showWebsiteDiscoveryToasts(body.websiteDiscovery ?? undefined)
      router.refresh()
    } catch {
      setError("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
        {loading ? "Hämtar…" : (label ?? "Uppdatera från Bolagsfakta")}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  )
}
