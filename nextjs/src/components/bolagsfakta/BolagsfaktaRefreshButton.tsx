"use client"

import Link from "next/link"
import { showWebsiteDiscoveryToasts } from "@/components/bolagsfakta/showWebsiteDiscoveryToasts"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ExternalLink, RefreshCw } from "lucide-react"

export type BolagsfaktaSummaryStat = { label: string; value: number }

type BolagsfaktaRefreshToolbarProps = {
  sourceUrl: string | null
  /** Saknas tills första hämtning (tom BF-vy). */
  scrapedAt: Date | null
  /** Visas i samma panel som tidsstämpel och knappar. */
  summaryStats: BolagsfaktaSummaryStat[]
}

type BolagsfaktaRefreshButtonProps = {
  customerId: string
  /** Default: "Uppdatera från Bolagsfakta" — use a fetch-oriented label when BF-data is missing. */
  label?: string
  /** Bolagsfakta-flik: sammanfattning + tidsrad + knappar i en panel, alert under i full bredd. */
  toolbar?: BolagsfaktaRefreshToolbarProps
}

function RefreshAlert({
  variant,
  title,
  children,
}: {
  variant: "error" | "success"
  title: string
  children: React.ReactNode
}) {
  const box =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950"
  const titleCls = variant === "error" ? "text-red-900" : "text-emerald-900"
  const bodyCls = variant === "error" ? "text-red-800" : "text-emerald-800"

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`w-full rounded-md border px-3 py-2 text-left text-xs shadow-sm ${box}`}
    >
      <p className={`font-medium ${titleCls}`}>{title}</p>
      <div className={`mt-0.5 break-words ${bodyCls}`}>{children}</div>
    </div>
  )
}

export default function BolagsfaktaRefreshButton({ customerId, label, toolbar }: BolagsfaktaRefreshButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Visas tills sidan laddas om (ingen auto-dismiss). */
  const [doneBanner, setDoneBanner] = useState<string | null>(null)

  async function onClick() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/company-facts/refresh`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        detail?: string
        websiteDiscovery?: WebsiteDiscoveryResult | null
      }
      if (!res.ok) {
        const main = body.error ?? "Kunde inte uppdatera"
        const combined =
          body.detail && body.detail !== body.error ? `${main} (${body.detail})` : main
        setError(combined)
        return
      }
      const bannerText =
        "Bolagsfakta har uppdaterats och uppgifterna på sidan har hämtats på nytt. Det här meddelandet försvinner när du laddar om sidan."
      setDoneBanner(bannerText)
      toast.success("Bolagsfakta uppdaterad", {
        description: "Se bekräftelsen under knapparna — den ligger kvar tills du laddar om sidan.",
      })
      showWebsiteDiscoveryToasts(body.websiteDiscovery ?? undefined)
      router.refresh()
    } catch {
      setError("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  const refreshBtn = (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
      {loading ? "Hämtar…" : (label ?? "Uppdatera från Bolagsfakta")}
    </button>
  )

  const alerts = (
    <>
      {error && (
        <RefreshAlert variant="error" title="Något gick fel">
          {error}
        </RefreshAlert>
      )}
      {doneBanner && (
        <RefreshAlert variant="success" title="Klart">
          {doneBanner}
        </RefreshAlert>
      )}
    </>
  )

  if (toolbar) {
    const { sourceUrl, scrapedAt, summaryStats } = toolbar
    return (
      <div className="w-full space-y-3">
        <div className="panel-surface w-full overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3 lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 shrink-0">Sammanfattning</h2>
              <dl className="flex flex-wrap items-center gap-x-8 gap-y-1 min-w-0">
                {summaryStats.map(({ label, value }) => (
                  <div key={label} className="flex items-baseline gap-2 shrink-0">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 lg:justify-end lg:shrink-0">
              {scrapedAt ? (
                <p className="text-xs text-gray-500 lg:text-right">
                  Senast hämtad från Bolagsfakta:{" "}
                  <time dateTime={scrapedAt.toISOString()} className="font-medium text-gray-700">
                    {scrapedAt.toLocaleString("sv-SE")}
                  </time>
                </p>
              ) : null}
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {refreshBtn}
                {sourceUrl ? (
                  <Link
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Öppna på Bolagsfakta
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {alerts}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {refreshBtn}
      <div className="flex w-full flex-col gap-2">{alerts}</div>
    </div>
  )
}
