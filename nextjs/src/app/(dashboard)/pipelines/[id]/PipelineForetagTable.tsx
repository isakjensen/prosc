"use client"

import Link from "next/link"
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import PipelineForetagActions from "./PipelineForetagActions"

const BOLAGSFORM_ABBREV: Record<string, string> = {
  "aktiebolag": "AB",
  "privat aktiebolag": "AB",
  "publikt aktiebolag": "AB (publ)",
  "handelsbolag": "HB",
  "kommanditbolag": "KB",
  "enskild firma": "EF",
  "enskild näringsidkare": "EF",
  "ekonomisk förening": "Ek.för.",
  "bostadsrättsförening": "Brf",
  "ideell förening": "Ideell för.",
  "stiftelse": "Stift.",
  "europabolag": "SE",
  "enkelt bolag": "EB",
  "samfällighetsförening": "Samf.för.",
  "filial": "Filial",
}

function abbreviateBolagsform(bolagsform: string | null): string {
  if (!bolagsform) return "–"
  return BOLAGSFORM_ABBREV[bolagsform.toLowerCase()] ?? bolagsform
}

export type PipelineForetagRow = {
  id: string
  namn: string
  adress: string | null
  orgNummer: string | null
  bolagsform: string | null
  url: string | null
  /** Företagets webbplats (kundpost eller upptäckt via Bolagsfakta) */
  website: string | null
  customerId: string | null
  customerStage: string | null
  hasBolagsfakta: boolean
  bolagsfaktaUpdatedAt: string | null
  isRedlisted: boolean
  detailStatus: "IDLE" | "QUEUED" | "RUNNING" | "SUCCESS" | "ERROR"
  detailJobId: string | null
  detailQueuedAt: string | null
  detailStartedAt: string | null
  detailFinishedAt: string | null
  detailError: string | null
  omsattning: string | null
  ebitda: string | null
  aretsResultat: string | null
}

export type BatchStatus = "pending" | "running" | "success" | "error"

export function isEligibleForBatch(f: PipelineForetagRow): boolean {
  return Boolean(f.customerId) && Boolean(f.url) && !f.isRedlisted
}

/** Kan köa ny detaljhämtning (ej redan köad eller pågående). */
export function canQueueDetailFetch(f: PipelineForetagRow): boolean {
  return isEligibleForBatch(f) && f.detailStatus !== "QUEUED" && f.detailStatus !== "RUNNING"
}

/** Kan köa webbplats-sökning / synk detaljskrapning (samma villkor som detaljjobb). */
export function canQueueWebsiteScan(f: PipelineForetagRow): boolean {
  return canQueueDetailFetch(f)
}

/** Ingen visad webbplats (varken manuell eller upptäckt). */
export function rowMissingWebsite(f: PipelineForetagRow): boolean {
  return !f.website?.trim()
}

/** Saknar bolagsfakta-data eller senaste hämtning misslyckades. */
export function rowNeedsDetailScrape(f: PipelineForetagRow): boolean {
  return !f.hasBolagsfakta || f.detailStatus === "ERROR"
}

interface Props {
  pipelineId: string
  rows: PipelineForetagRow[]
  selectedIds?: Set<string>
  onToggle?: (id: string) => void
  onToggleAll?: () => void
  statuses?: Map<string, BatchStatus>
  errors?: Map<string, string>
  batchRunning?: boolean
  /** Separat progress för webbplats-sökning (visas i statuskolumnen när aktiv). */
  siteStatuses?: Map<string, BatchStatus>
  siteErrors?: Map<string, string>
  siteBatchRunning?: boolean
  /** När webbplats-sökning pågår: annan text i BF-data-kolumnen än vid vanlig detaljskrapning. */
  websiteBfLoadingByRow?: Map<string, "pending" | "running">
  onSoloWebsiteDiscoverLoading?: (foretagId: string, loading: boolean) => void
}

function parseResultatSign(aretsResultat: string | null): "positive" | "negative" | null {
  if (!aretsResultat) return null
  const stripped = aretsResultat.replace(/\s/g, "")
  if (stripped.startsWith("-") && stripped.length > 1) return "negative"
  const num = parseFloat(stripped.replace(/[^\d.-]/g, ""))
  if (!isNaN(num)) return num < 0 ? "negative" : "positive"
  return null
}

function rowAccentClass(f: PipelineForetagRow, status?: BatchStatus) {
  if (status === "success") {
    return "border-l-4 border-l-brand-green bg-brand-green/10 hover:bg-brand-green/15 dark:bg-brand-green/15 dark:hover:bg-brand-green/20"
  }
  if (status === "error") {
    return "border-l-4 border-l-red-500 bg-red-50/60 hover:bg-red-50/80 dark:bg-red-950/20 dark:hover:bg-red-950/30"
  }
  if (status === "running") {
    return "border-l-4 border-l-blue-500 bg-blue-50/60 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
  }
  if (f.isRedlisted) {
    return "border-l-4 border-l-red-600 bg-red-50/90 hover:bg-red-100/90 dark:bg-red-950/25 dark:hover:bg-red-950/40"
  }
  if (f.customerStage === "PROSPECT" || f.customerStage === "CUSTOMER") {
    return "border-l-4 border-l-brand-green bg-brand-green/15 hover:bg-brand-green/20 dark:bg-brand-green/20 dark:hover:bg-brand-green/25"
  }
  return "hover:bg-gray-50"
}

function stageBadge(
  customerId: string | null,
  customerStage: string | null,
): { label: string; variant: "gray" | "success" | "info" | "warning" } | null {
  if (!customerId) {
    return null
  }
  switch (customerStage) {
    case "CUSTOMER":
      return { label: "Kund", variant: "success" as const }
    case "PROSPECT":
      return { label: "Prospect", variant: "info" as const }
    case "SCRAPED":
      return null
    case "ARCHIVED":
      return { label: "Arkiverad", variant: "warning" as const }
    default:
      return { label: customerStage ?? "–", variant: "gray" as const }
  }
}

function StatusIndicator({ status, error }: { status?: BatchStatus; error?: string }) {
  if (!status) return null
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-gray-400" aria-label="Väntar" />
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" aria-label="Hämtar..." />
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-brand-green" aria-label="Klar" />
    case "error":
      return (
        <span className="inline-flex items-center gap-1" title={error}>
          <AlertCircle className="h-4 w-4 text-red-600" aria-label="Fel" />
        </span>
      )
  }
}

function detailStatusLabel(status?: PipelineForetagRow["detailStatus"]) {
  switch (status) {
    case "QUEUED":
      return "Köad"
    case "RUNNING":
      return "Skrapar…"
    case "SUCCESS":
      return "Klar"
    case "ERROR":
      return "Fel"
    default:
      return null
  }
}

function DetailScrapeStatusCell({
  f,
  websiteLoadPhase,
}: {
  f: PipelineForetagRow
  websiteLoadPhase?: "pending" | "running"
}) {
  if (websiteLoadPhase === "pending") {
    return (
      <div className="flex justify-center">
        <span
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums text-brand-brown"
          title="Webbplats-sökning är köad"
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Köar webbsökning…
        </span>
      </div>
    )
  }

  if (websiteLoadPhase === "running") {
    return (
      <div className="flex justify-center">
        <span
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums text-brand-brown"
          title="Söker företagets webbplats (Google + AI)"
        >
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          Söker webbplats…
        </span>
      </div>
    )
  }

  const s = f.detailStatus
  if (!s || s === "IDLE") {
    return <span className="text-xs text-gray-400">–</span>
  }

  const label = detailStatusLabel(s)
  let Icon: LucideIcon | null = null
  let textClass = "text-gray-600"

  switch (s) {
    case "SUCCESS":
      Icon = CheckCircle2
      textClass = "text-brand-green"
      break
    case "ERROR":
      Icon = AlertCircle
      textClass = "text-red-600"
      break
    case "RUNNING":
      Icon = Loader2
      textClass = "text-brand-brown"
      break
    case "QUEUED":
      Icon = Clock
      textClass = "text-gray-500"
      break
    default:
      break
  }

  return (
    <div className="flex justify-center">
      <span
        className={`inline-flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums ${textClass}`}
        title={s === "ERROR" ? (f.detailError ?? label ?? undefined) : label ?? undefined}
      >
        {Icon ? (
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${s === "RUNNING" ? "animate-spin" : ""}`}
            aria-hidden
          />
        ) : null}
        {label}
      </span>
    </div>
  )
}

export default function PipelineForetagTable({
  pipelineId,
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  statuses,
  errors,
  batchRunning,
  siteStatuses,
  siteErrors,
  siteBatchRunning,
  websiteBfLoadingByRow,
  onSoloWebsiteDiscoverLoading,
}: Props) {
  const hasSelection = selectedIds !== undefined
  const showStatusColumns = Boolean(
    hasSelection &&
      selectedIds &&
      (selectedIds.size > 0 ||
        (statuses && statuses.size > 0) ||
        batchRunning ||
        (siteStatuses && siteStatuses.size > 0) ||
        siteBatchRunning),
  )
  const eligibleRows = rows.filter(isEligibleForBatch)
  const allEligibleSelected = eligibleRows.length > 0 && eligibleRows.every((r) => selectedIds?.has(r.id))

  return (
    <table className="w-full min-w-[64rem] text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          {hasSelection && (
            <th className="pl-4 pr-2 py-3 align-middle w-10">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                checked={allEligibleSelected}
                onChange={onToggleAll}
                disabled={batchRunning || siteBatchRunning || eligibleRows.length === 0}
                title="Välj alla valbara företag"
              />
            </th>
          )}
          <th
            className={cn(
              "px-2 py-3 align-middle text-center text-xs font-semibold uppercase tracking-wide text-gray-400 w-10",
              !showStatusColumns && "hidden",
            )}
            suppressHydrationWarning
          >
            Status
          </th>
          <th className="px-3 py-3 align-middle text-center text-xs font-semibold uppercase tracking-wide text-gray-400 w-[5.5rem] whitespace-nowrap">
            BF-data
          </th>
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[10rem]">
            Företag
          </th>
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[14rem]">
            Adress
          </th>
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[11rem] whitespace-nowrap">
            Org.nr
          </th>
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[11rem]">
            Ekonomi
          </th>
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
            Bolagsform
          </th>
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[10rem]">
            Webbplats
          </th>
          <th className="px-6 py-3 align-middle text-right text-xs font-semibold uppercase tracking-wide text-gray-400 w-[10rem]">
            {" "}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((f) => {
          const stage = stageBadge(f.customerId, f.customerStage)
          const eligible = isEligibleForBatch(f)
          const rowStatus = siteStatuses?.get(f.id) ?? statuses?.get(f.id)
          const rowError = siteErrors?.get(f.id) ?? errors?.get(f.id)
          const nameClass = f.hasBolagsfakta
            ? "font-medium text-brand-green hover:opacity-90 transition-colors inline-block max-w-full break-words"
            : "font-medium text-gray-900 hover:text-zinc-600 transition-colors inline-block max-w-full break-words"

          const nameInner = (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {f.hasBolagsfakta && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
              )}
              <span>{f.namn}</span>
            </span>
          )

          return (
            <tr
              key={f.id}
              className={cn("transition-colors", rowAccentClass(f, rowStatus))}
            >
              {hasSelection && (
                <td className="pl-4 pr-2 py-3 align-middle">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    checked={selectedIds.has(f.id)}
                    onChange={() => onToggle?.(f.id)}
                    disabled={!eligible || batchRunning || siteBatchRunning}
                    title={
                      !eligible
                        ? f.isRedlisted
                          ? "Redlistat företag kan inte hämtas"
                          : !f.customerId
                            ? "Saknar kopplad kund"
                            : "Saknar Bolagsfakta-URL"
                        : undefined
                    }
                  />
                </td>
              )}
              <td
                className={cn(
                  "px-2 py-3 align-middle text-center",
                  !showStatusColumns && "hidden",
                )}
              >
                <StatusIndicator status={rowStatus} error={rowError} />
              </td>
              <td className="px-3 py-3 align-middle">
                <DetailScrapeStatusCell
                  f={f}
                  websiteLoadPhase={websiteBfLoadingByRow?.get(f.id)}
                />
              </td>
              <td className="px-6 py-3 align-middle">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {f.customerId ? (
                      <Link
                        href={`/customers/${f.customerId}?tab=bolagsfakta`}
                        className={nameClass}
                      >
                        {nameInner}
                      </Link>
                    ) : (
                      <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-gray-500 max-w-full break-words">
                        {nameInner}
                      </span>
                    )}
                    {stage ? (
                      <Badge variant={stage.variant} className="text-[10px] px-1.5 py-0 font-medium">
                        {stage.label}
                      </Badge>
                    ) : null}
                    {f.isRedlisted && (
                      <Badge variant="danger" className="text-[10px] px-1.5 py-0 font-medium">
                        Redlistad
                      </Badge>
                    )}
                  </div>
                  {rowError && (
                    <p className="text-xs text-red-600 max-w-md truncate" title={rowError}>
                      {rowError}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-3 align-middle text-xs text-gray-500 whitespace-normal break-words leading-snug">
                {f.adress ?? "–"}
              </td>
              <td className="px-6 py-3 align-middle text-gray-500 whitespace-nowrap">{f.orgNummer ?? "–"}</td>
              <td className="px-6 py-3 align-middle">
                {f.omsattning || f.ebitda || f.aretsResultat ? (
                  <div className="flex flex-col gap-0.5 text-xs">
                    {f.omsattning && (
                      <span className="text-gray-600 whitespace-nowrap">
                        <span className="text-gray-400">Oms </span>{f.omsattning}
                      </span>
                    )}
                    {f.ebitda && (
                      <span className="text-gray-600 whitespace-nowrap">
                        <span className="text-gray-400">EBITDA </span>{f.ebitda}
                      </span>
                    )}
                    {(() => {
                      const sign = parseResultatSign(f.aretsResultat)
                      if (!sign) return null
                      return (
                        <span className={sign === "positive" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {sign === "positive" ? "▲ Vinst" : "▼ Förlust"}
                        </span>
                      )
                    })()}
                  </div>
                ) : (
                  <span className="text-gray-300 text-xs">–</span>
                )}
              </td>
              <td className="px-6 py-3 align-middle text-gray-500 whitespace-nowrap">
                {abbreviateBolagsform(f.bolagsform)}
              </td>
              <td className="px-6 py-3 align-middle text-gray-500 min-w-[10rem] max-w-[14rem]">
                {f.website ? (
                  <a
                    href={
                      f.website.startsWith("http://") || f.website.startsWith("https://")
                        ? f.website
                        : `https://${f.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-800 hover:underline break-all line-clamp-2"
                  >
                    {f.website}
                  </a>
                ) : (
                  <span className="text-gray-400">Ingen webbplats</span>
                )}
              </td>
              <td className="px-6 py-3 align-middle text-right">
                <PipelineForetagActions
                  pipelineId={pipelineId}
                  foretagId={f.id}
                  hasCustomer={Boolean(f.customerId)}
                  customerStage={f.customerStage}
                  isRedlisted={f.isRedlisted}
                  bolagsfaktaUrl={f.url}
                  detailStatus={f.detailStatus}
                  onSoloWebsiteDiscoverLoading={onSoloWebsiteDiscoverLoading}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
