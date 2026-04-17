"use client"

import { Badge } from "@/components/ui/badge"

const statusConfig: Record<
  string,
  { label: string; variant: "gray" | "info" | "success" | "warning" | "danger" }
> = {
  draft: { label: "Utkast", variant: "gray" },
  queued: { label: "I kö", variant: "info" },
  scheduled: { label: "Schemalagd", variant: "info" },
  sent: { label: "Skickad", variant: "success" },
  delivered: { label: "Levererad", variant: "success" },
  opened: { label: "Öppnad", variant: "success" },
  bounced: { label: "Studsad", variant: "danger" },
  failed: { label: "Misslyckad", variant: "danger" },
}

export default function EmailStatusBadge({
  status,
  openCount,
}: {
  status: string
  openCount?: number
}) {
  const config = statusConfig[status] ?? { label: status, variant: "gray" as const }
  const label =
    status === "opened" && openCount && openCount > 1
      ? `${config.label} (${openCount}x)`
      : config.label

  return <Badge variant={config.variant}>{label}</Badge>
}
