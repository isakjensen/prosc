"use client"

import { useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/components/confirm/ConfirmProvider"
import { Button } from "@/components/ui/button"

interface Props {
  pipelineId: string
  pipelineNamn: string
  status: string
}

export default function PipelineListDeleteButton({ pipelineId, pipelineNamn, status }: Props) {
  const confirm = useConfirm()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const ok = await confirm({
      title: "Ta bort pipeline?",
      description: `Du raderar permanent «${pipelineNamn}».`,
      bullets: [
        "Alla företagsrader i den här listan försvinner",
        "Kunder som bara fanns här tas bort, inklusive kontakter och tillhörande uppgifter",
        "Kunder som också finns i en annan pipeline behålls",
      ],
      confirmLabel: "Ta bort",
      cancelLabel: "Avbryt",
      variant: "danger",
      irreversible: true,
    })
    if (!ok) return

    setLoading(true)
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, { method: "DELETE" })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        deletedCustomerCount?: number
      }
      if (res.status === 409) {
        toast.error(body.error ?? "Pipeline körs — stoppa den först.")
        return
      }
      if (!res.ok) {
        toast.error(body.error ?? "Kunde inte ta bort pipelinen.")
        return
      }
      const n = body.deletedCustomerCount
      toast.success(
        typeof n === "number"
          ? `Pipelinen är borttagen. ${n} kund(er) som bara fanns här raderades.`
          : "Pipelinen är borttagen.",
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte ta bort pipelinen.")
    } finally {
      setLoading(false)
    }
  }

  const running = status === "RUNNING"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
      disabled={loading || running}
      title={
        running
          ? "Stoppa pipelinen innan du kan ta bort den"
          : loading
            ? "Tar bort…"
            : "Ta bort pipeline"
      }
      aria-label={`Ta bort pipeline ${pipelineNamn}`}
      onClick={handleClick}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
