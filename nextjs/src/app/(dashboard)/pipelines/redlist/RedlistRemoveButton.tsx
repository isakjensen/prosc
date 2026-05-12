"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"

export function FilterRemoveButton({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onRemove() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/company-facts/redlist?id=${encodeURIComponent(entryId)}`,
        { method: "DELETE" },
      )
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Kunde inte ta bort",
        )
        return
      }
      toast.success("Borttaget")
      router.refresh()
    } catch {
      toast.error("Nätverksfel")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/40"
      disabled={loading}
      onClick={onRemove}
    >
      {loading ? "…" : "Ta bort"}
    </Button>
  )
}
