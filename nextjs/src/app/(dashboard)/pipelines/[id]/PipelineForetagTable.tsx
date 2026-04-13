"use client"

import Link from "next/link"
import { CheckCircle2, ExternalLink, Loader2, AlertCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import PipelineForetagActions from "./PipelineForetagActions"

export type PipelineForetagRow = {
  id: string
  namn: string
  adress: string | null
  orgNummer: string | null
  bolagsform: string | null
  url: string | null
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
}

export type BatchStatus = "pending" | "running" | "success" | "error"

export function isEligibleForBatch(f: PipelineForetagRow): boolean {
  return Boolean(f.customerId) && Boolean(f.url) && !f.isRedlisted
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
}

function rowAccentClass(f: PipelineForetagRow, status?: BatchStatus) {
  if (status === "success") {
    return "border-l-4 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-50/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
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
    return "border-l-4 border-l-emerald-600 bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40"
  }
  return "hover:bg-gray-50"
}

function stageBadge(customerId: string | null, customerStage: string | null) {
  if (!customerId) {
    return { label: "Pipeline", variant: "gray" as const }
  }
  switch (customerStage) {
    case "CUSTOMER":
      return { label: "Kund", variant: "success" as const }
    case "PROSPECT":
      return { label: "Prospect", variant: "info" as const }
    case "SCRAPED":
      return { label: "Pipeline", variant: "gray" as const }
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
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Klar" />
    case "error":
      return (
        <span className="inline-flex items-center gap-1" title={error}>
          <AlertCircle className="h-4 w-4 text-red-600" aria-label="Fel" />
        </span>
      )
  }
}

function DetailStatusIndicator({
  status,
  error,
}: {
  status?: PipelineForetagRow["detailStatus"]
  error?: string | null
}) {
  if (!status || status === "IDLE") return null
  switch (status) {
    case "QUEUED":
      return <Clock className="h-4 w-4 text-gray-400" aria-label="Köad" />
    case "RUNNING":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" aria-label="Skrapar..." />
    case "SUCCESS":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Klar" />
    case "ERROR":
      return (
        <span className="inline-flex items-center gap-1" title={error ?? undefined}>
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

export default function PipelineForetagTable({
  pipelineId,
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  statuses,
  errors,
  batchRunning,
}: Props) {
  const hasSelection = selectedIds !== undefined
  const showStatusColumns = Boolean(hasSelection && selectedIds && selectedIds.size > 0)
  const eligibleRows = rows.filter(isEligibleForBatch)
  const allEligibleSelected = eligibleRows.length > 0 && eligibleRows.every((r) => selectedIds?.has(r.id))

  return (
    <table className="w-full min-w-[56rem] text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          {hasSelection && (
            <th className="pl-4 pr-2 py-3 align-middle w-10">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                checked={allEligibleSelected}
                onChange={onToggleAll}
                disabled={batchRunning || eligibleRows.length === 0}
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
          <th
            className={cn(
              "px-2 py-3 align-middle text-center text-xs font-semibold uppercase tracking-wide text-gray-400 w-10",
              !showStatusColumns && "hidden",
            )}
            suppressHydrationWarning
          >
            Detail
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
          <th className="px-6 py-3 align-middle text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[12rem]">
            Bolagsform
          </th>
          <th className="px-2 py-3 align-middle text-center text-xs font-semibold uppercase tracking-wide text-gray-400 w-12" title="Öppna bolagsfakta.se">
            BF
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
          const rowStatus = statuses?.get(f.id)
          const rowError = errors?.get(f.id)
          const detailLabel = detailStatusLabel(f.detailStatus)
          const nameClass = f.hasBolagsfakta
            ? "font-medium text-emerald-700 hover:text-emerald-800 transition-colors inline-block max-w-full break-words"
            : "font-medium text-gray-900 hover:text-zinc-600 transition-colors inline-block max-w-full break-words"

          const nameInner = (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {f.hasBolagsfakta && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
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
                    disabled={!eligible || batchRunning}
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
              <td
                className={cn(
                  "px-2 py-3 align-middle text-center",
                  !showStatusColumns && "hidden",
                )}
              >
                <DetailStatusIndicator status={f.detailStatus} error={f.detailError} />
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
                    <Badge variant={stage.variant} className="text-[10px] px-1.5 py-0 font-medium">
                      {stage.label}
                    </Badge>
                    {detailLabel && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                        title={f.detailStatus === "ERROR" ? (f.detailError ?? detailLabel) : detailLabel}
                      >
                        <DetailStatusIndicator status={f.detailStatus} error={f.detailError} />
                        <span>{detailLabel}</span>
                      </span>
                    )}
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
              <td className="px-6 py-3 align-middle text-gray-500 whitespace-normal break-words">{f.adress ?? "–"}</td>
              <td className="px-6 py-3 align-middle text-gray-500 whitespace-nowrap">{f.orgNummer ?? "–"}</td>
              <td className="px-6 py-3 align-middle text-gray-500 whitespace-normal break-words min-w-[12rem]">
                {f.bolagsform ?? "–"}
              </td>
              <td className="px-2 py-3 align-middle text-center">
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    title="Öppna på Bolagsfakta"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Öppna på Bolagsfakta</span>
                  </a>
                ) : (
                  <span className="text-gray-300">–</span>
                )}
              </td>
              <td className="px-6 py-3 align-middle text-right">
                <PipelineForetagActions
                  pipelineId={pipelineId}
                  foretagId={f.id}
                  hasCustomer={Boolean(f.customerId)}
                  isRedlisted={f.isRedlisted}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
