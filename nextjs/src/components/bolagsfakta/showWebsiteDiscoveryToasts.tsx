"use client"

import { toast } from "sonner"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"

function nonEmpty(s: string | null | undefined): boolean {
  return Boolean(s && String(s).trim().length > 0)
}

/**
 * Visar tydliga toasts för hemsida / e-post / telefon efter AI-sök (Ollama + Google).
 */
export function showWebsiteDiscoveryToasts(result: WebsiteDiscoveryResult | null | undefined): void {
  if (result == null) return

  if (result.skipped) {
    toast.info("Webb & kontakt (AI)", {
      description: result.skipReason ?? "Ingen automatisk sökning kördes.",
      duration: 6000,
    })
    return
  }

  if (result.googleError) {
    toast.warning("Google-sök", {
      description: result.googleError,
      duration: 8000,
    })
  }

  if (result.ollamaError) {
    toast.error("Ollama (AI)", {
      description: result.ollamaError,
      duration: 10000,
    })
  }

  const e = result.enrichment
  const webOk = nonEmpty(e?.website)
  const mailOk = nonEmpty(e?.email)
  const phoneOk = nonEmpty(e?.phone)

  const lines: string[] = [
    webOk ? `Webb: ${e!.website!.trim()}` : "Webb: hittades inte",
    mailOk ? `E-post: ${e!.email!.trim()}` : "E-post: hittades inte",
    phoneOk ? `Telefon: ${e!.phone!.trim()}` : "Telefon: hittades inte",
  ]
  if (e?.confidence) {
    lines.push(`Säkerhet (AI): ${e.confidence}`)
  }

  const allFound = webOk && mailOk && phoneOk
  const someFound = webOk || mailOk || phoneOk

  if (result.ollamaError && !e) {
    return
  }

  if (allFound) {
    toast.success("AI hittade webb, e-post och telefon", {
      description: lines.slice(0, 4).join("\n"),
      duration: 12000,
    })
    return
  }

  if (someFound) {
    toast.message("AI-sök: delvis träff", {
      description: lines.join("\n"),
      duration: 12000,
    })
    return
  }

  if (!result.ollamaError) {
    toast.warning("AI hittade ingen webb, e-post eller telefon", {
      description: lines.join("\n"),
      duration: 10000,
    })
  }
}
