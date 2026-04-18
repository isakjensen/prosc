"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useConfirm } from "@/components/confirm/ConfirmProvider"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { showWebsiteDiscoveryToasts } from "@/components/bolagsfakta/showWebsiteDiscoveryToasts"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"

const MENU_WIDTH = 224
const MENU_VIEW_MARGIN = 8
const MENU_GAP = 4
/** Fallback om höjd inte hunnit mätas (≈ 4 knappar + separator + padding). */
const MENU_HEIGHT_FALLBACK = 308

interface Props {
  pipelineId: string
  foretagId: string
  hasCustomer: boolean
  /** null om ingen kund; SCRAPED = pipeline-rad, PROSPECT = prospekt osv. */
  customerStage: string | null
  isRedlisted: boolean
  bolagsfaktaUrl: string | null
  detailStatus: "IDLE" | "QUEUED" | "RUNNING" | "SUCCESS" | "ERROR"
  /** Meddelar tabellen att en en-rads webbsökning pågår (BF-data-kolumnen visar annan text). */
  onSoloWebsiteDiscoverLoading?: (foretagId: string, loading: boolean) => void
}

export default function PipelineForetagActions({
  pipelineId,
  foretagId,
  hasCustomer,
  customerStage,
  isRedlisted,
  bolagsfaktaUrl,
  detailStatus,
  onSoloWebsiteDiscoverLoading,
}: Props) {
  const confirm = useConfirm()
  const router = useRouter()
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState<
    "fetch" | "discover" | "promote" | "demote" | "remove" | "redlist" | null
  >(null)
  const [error, setError] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    function updatePosition() {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const left = Math.min(
        window.innerWidth - MENU_WIDTH - MENU_VIEW_MARGIN,
        Math.max(MENU_VIEW_MARGIN, r.right - MENU_WIDTH),
      )

      const menuEl = menuRef.current
      const measured =
        menuEl && menuEl.getBoundingClientRect().height > 0
          ? menuEl.getBoundingClientRect().height
          : MENU_HEIGHT_FALLBACK
      const menuHeight = measured

      const vh = window.innerHeight
      const spaceBelow = vh - r.bottom - MENU_VIEW_MARGIN
      const spaceAbove = r.top - MENU_VIEW_MARGIN

      const fitsBelow = menuHeight + MENU_GAP <= spaceBelow
      const fitsAbove = menuHeight + MENU_GAP <= spaceAbove

      let top: number
      if (fitsBelow) {
        top = r.bottom + MENU_GAP
      } else if (fitsAbove) {
        top = r.top - menuHeight - MENU_GAP
      } else if (spaceBelow >= spaceAbove) {
        top = r.bottom + MENU_GAP
      } else {
        top = r.top - menuHeight - MENU_GAP
      }

      const maxTop = vh - menuHeight - MENU_VIEW_MARGIN
      if (top > maxTop) top = Math.max(MENU_VIEW_MARGIN, maxTop)
      if (top < MENU_VIEW_MARGIN) top = MENU_VIEW_MARGIN

      setMenuPos({ top, left })
    }

    updatePosition()
    const id = requestAnimationFrame(() => updatePosition())
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [open])

  const detailBusy = detailStatus === "QUEUED" || detailStatus === "RUNNING"

  async function discoverWebsite() {
    setLoading("discover")
    setError("")
    onSoloWebsiteDiscoverLoading?.(foretagId, true)
    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/companies/${foretagId}/discover-website`,
        { method: "POST" },
      )
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        websiteDiscovery?: WebsiteDiscoveryResult | null
      }
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      toast.success("Webbplats-sökning klar")
      showWebsiteDiscoveryToasts(body.websiteDiscovery ?? undefined)
      setOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte söka webbplats."
      setError(msg)
      console.error("[PipelineForetagActions] discover-website failed", e)
    } finally {
      onSoloWebsiteDiscoverLoading?.(foretagId, false)
      setLoading(null)
    }
  }

  async function fetchDetail() {
    setLoading("fetch")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/companies/${foretagId}/fetch-detail`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        debugLogFile?: string
        sessionId?: string
        jobId?: string
      }
      if (!res.ok) {
        if (body.debugLogFile) {
          console.warn("[Bolagsfakta] Fel — se server-logg:", body.debugLogFile, "session:", body.sessionId)
        }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      if (body.debugLogFile) {
        console.info("[Bolagsfakta] Debug-logg (fil):", body.debugLogFile, "session:", body.sessionId)
      }
      toast.success("Detaljskrapning köad")
      setOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte hämta data."
      setError(msg)
      console.error("[PipelineForetagActions] fetch-detail failed", e)
    } finally {
      setLoading(null)
    }
  }

  async function removeFromPipeline() {
    const ok = await confirm({
      title: hasCustomer ? "Ta bort kund helt?" : "Ta bort från pipelinen?",
      description: hasCustomer
        ? "Hela kunden tas bort från systemet: kontakter, Bolagsfakta-data och övrig kopplad information. Detta går inte att ångra."
        : "Raden tas bort från pipelinen.",
      variant: "danger",
      confirmLabel: "Ta bort",
      cancelLabel: "Avbryt",
    })
    if (!ok) return

    setLoading("remove")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/companies/${foretagId}`, {
        method: "DELETE",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte ta bort."
      setError(msg)
      console.error("[PipelineForetagActions] delete failed", e)
    } finally {
      setLoading(null)
    }
  }

  async function promote() {
    setLoading("promote")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/companies/${foretagId}/promote`, {
        method: "POST",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      toast.success("Prospekt skapat — bolaget finns nu som prospekt i CRM.")
      setOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte ta vidare till prospekt."
      setError(msg)
      console.error("[PipelineForetagActions] promote failed", e)
    } finally {
      setLoading(null)
    }
  }

  async function demoteToPipeline() {
    const ok = await confirm({
      title: "Lägg tillbaka i pipeline?",
      description:
        "Bolaget flyttas tillbaka till pipeline (stadie: skrapad). Det visas som pipeline-rad igen, inte som aktivt prospekt.",
      confirmLabel: "Lägg tillbaka",
      cancelLabel: "Avbryt",
    })
    if (!ok) return

    setLoading("demote")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/companies/${foretagId}/demote`, {
        method: "POST",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      toast.success("Bolaget är tillbaka i pipeline.")
      setOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte lägga tillbaka i pipeline."
      setError(msg)
      console.error("[PipelineForetagActions] demote failed", e)
    } finally {
      setLoading(null)
    }
  }

  async function addToRedlist() {
    setLoading("redlist")
    setError("")
    try {
      const res = await fetch("/api/company-facts/redlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foretagId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      toast.success("Tillagd på redlist")
      setOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte redlista."
      setError(msg)
      console.error("[PipelineForetagActions] redlist failed", e)
    } finally {
      setLoading(null)
    }
  }

  const canPromoteToProspect = hasCustomer && customerStage === "SCRAPED"
  const canReturnToPipeline = hasCustomer && customerStage === "PROSPECT"
  const canDiscoverWebsite =
    hasCustomer && Boolean(bolagsfaktaUrl?.trim()) && !isRedlisted && !detailBusy

  const menuPortal =
    mounted &&
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[9998] cursor-default bg-transparent"
          aria-label="Stäng meny"
          onClick={() => setOpen(false)}
        />
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[14rem] rounded-md border border-gray-200 bg-white py-1 shadow-xl"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
        >
          <Button
            variant="ghost"
            className="w-full justify-start rounded-none px-3 py-2 text-xs font-normal h-auto"
            disabled={!hasCustomer || loading !== null}
            onClick={() => void fetchDetail()}
          >
            {loading === "fetch" ? "Hämtar…" : "Hämta all Bolagsfakta-data"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start rounded-none px-3 py-2 text-xs font-normal h-auto"
            disabled={!canDiscoverWebsite || loading !== null}
            title={
              detailBusy
                ? "Vänta tills pågående detaljhämtning är klar"
                : !bolagsfaktaUrl?.trim()
                  ? "Saknar Bolagsfakta-URL"
                  : undefined
            }
            onClick={() => void discoverWebsite()}
          >
            {loading === "discover" ? "Söker…" : "Sök webbplats (AI + Google)"}
          </Button>
          {canPromoteToProspect ? (
            <Button
              variant="ghost"
              className="w-full justify-start rounded-none px-3 py-2 text-xs font-normal h-auto"
              disabled={loading !== null}
              onClick={() => void promote()}
            >
              {loading === "promote" ? "Sparar…" : "Ta vidare som prospekt"}
            </Button>
          ) : null}
          {canReturnToPipeline ? (
            <Button
              variant="ghost"
              className="w-full justify-start rounded-none px-3 py-2 text-xs font-normal h-auto"
              disabled={loading !== null}
              onClick={() => void demoteToPipeline()}
            >
              {loading === "demote" ? "Uppdaterar…" : "Lägg tillbaka i pipeline"}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="w-full justify-start rounded-none px-3 py-2 text-xs font-normal h-auto"
            disabled={isRedlisted || loading !== null}
            onClick={() => void addToRedlist()}
          >
            {loading === "redlist" ? "Sparar…" : isRedlisted ? "Redan redlistad" : "Lägg till på redlist"}
          </Button>
          <div className="my-1 border-t border-gray-100" role="separator" />
          <Button
            variant="ghost"
            className="w-full justify-start rounded-none px-3 py-2 text-xs font-normal h-auto text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={loading !== null}
            onClick={() => void removeFromPipeline()}
          >
            {loading === "remove" ? "Tar bort…" : hasCustomer ? "Ta bort kund helt…" : "Ta bort från pipelinen…"}
          </Button>
        </div>
      </>,
      document.body,
    )

  return (
    <div ref={anchorRef} className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        Åtgärder
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {menuPortal}
      {error && <p className="text-xs text-red-600 max-w-[14rem] text-right">{error}</p>}
    </div>
  )
}
