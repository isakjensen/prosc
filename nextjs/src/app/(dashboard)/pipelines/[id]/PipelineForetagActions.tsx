"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { showWebsiteDiscoveryToasts } from "@/components/bolagsfakta/showWebsiteDiscoveryToasts"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"
import { ChevronDown } from "lucide-react"

const MENU_WIDTH = 224
const MENU_VIEW_MARGIN = 8
const MENU_GAP = 4
/** Fallback om höjd inte hunnit mätas (≈ 4 knappar + separator + padding). */
const MENU_HEIGHT_FALLBACK = 260

interface Props {
  pipelineId: string
  foretagId: string
  hasCustomer: boolean
  isRedlisted: boolean
}

export default function PipelineForetagActions({
  pipelineId,
  foretagId,
  hasCustomer,
  isRedlisted,
}: Props) {
  const router = useRouter()
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState<"fetch" | "promote" | "remove" | "redlist" | null>(null)
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

  async function fetchDetail() {
    setLoading("fetch")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/foretag/${foretagId}/fetch-detail`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        debugLogFile?: string
        sessionId?: string
        websiteDiscovery?: WebsiteDiscoveryResult | null
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
      toast.success("Bolagsfakta-data sparad")
      showWebsiteDiscoveryToasts(body.websiteDiscovery ?? undefined)
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
    const ok = window.confirm(
      hasCustomer
        ? "Hela kunden tas bort från systemet: kontakter, Bolagsfakta-data och övrig kopplad information. Detta går inte att ångra. Fortsätt?"
        : "Raden tas bort från pipelinen. Fortsätt?",
    )
    if (!ok) return

    setLoading("remove")
    setError("")
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/foretag/${foretagId}`, {
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
      const res = await fetch(`/api/pipelines/${pipelineId}/foretag/${foretagId}/promote`, {
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

  async function addToRedlist() {
    setLoading("redlist")
    setError("")
    try {
      const res = await fetch("/api/bolagsfakta/redlist", {
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
            disabled={!hasCustomer || loading !== null}
            onClick={() => void promote()}
          >
            {loading === "promote" ? "Sparar…" : "Ta vidare som prospekt"}
          </Button>
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
