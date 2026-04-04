"use client"

import Link from "next/link"
import { CheckCircle2, ExternalLink } from "lucide-react"
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
  isRedlisted: boolean
}

interface Props {
  pipelineId: string
  rows: PipelineForetagRow[]
}

function rowAccentClass(f: PipelineForetagRow) {
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

export default function PipelineForetagTable({ pipelineId, rows }: Props) {
  return (
    <table className="w-full min-w-[56rem] text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
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
              className={cn("transition-colors", rowAccentClass(f))}
            >
              <td className="px-6 py-3 align-middle">
                <div className="flex flex-wrap items-center gap-1.5">
                  {f.customerId ? (
                    <Link
                      href={`/kunder/${f.customerId}?tab=bolagsfakta`}
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
                  {f.isRedlisted && (
                    <Badge variant="danger" className="text-[10px] px-1.5 py-0 font-medium">
                      Redlistad
                    </Badge>
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
