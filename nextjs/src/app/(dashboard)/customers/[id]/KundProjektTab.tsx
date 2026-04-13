"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type ProjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"

interface ProjectRow {
  id: string
  name: string
  status: ProjectStatus
}

const projectStatusLabel: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausad",
  ARCHIVED: "Arkiverad",
}

const projectStatusVariant: Record<string, "success" | "warning" | "gray"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  ARCHIVED: "gray",
}

interface Props {
  customerId: string
  linkedProjects: ProjectRow[]
  allProjects: ProjectRow[]
  linkedProjectIds: string[]
}

export default function KundProjektTab({
  customerId,
  linkedProjects: linkedInitial,
  allProjects,
  linkedProjectIds: linkedIdsInitial,
}: Props) {
  const router = useRouter()
  const [linked, setLinked] = useState<ProjectRow[]>(linkedInitial)
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set(linkedIdsInitial))
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(false)

  const unlinkedProjects = allProjects.filter((p) => !linkedIds.has(p.id))

  const thClass =
    "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"

  async function handleLink() {
    if (!selectedId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${selectedId}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      })
      if (res.status === 409) {
        toast.error("Projektet är redan kopplat till den här kunden.")
        return
      }
      if (!res.ok) throw new Error()
      const project = allProjects.find((p) => p.id === selectedId)
      if (project) {
        setLinked((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name, "sv")))
        setLinkedIds((prev) => new Set([...prev, selectedId]))
      }
      setSelectedId("")
      router.refresh()
    } catch {
      toast.error("Kunde inte koppla projekt. Försök igen.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlink(projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/customers/${customerId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      setLinked((prev) => prev.filter((p) => p.id !== projectId))
      setLinkedIds((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
      router.refresh()
    } catch {
      toast.error("Kunde inte ta bort kopplingen. Försök igen.")
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        En kund kan vara kopplad till flera projekt och ett projekt kan ha flera kunder — eller inga.
        Kopplingar är valfria åt båda håll.
      </p>

      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Kopplade projekt ({linked.length})</h2>
        </div>

        {linked.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">Inga projekt kopplade till den här kunden</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className={thClass}>Projekt</th>
                <th className={thClass}>Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Åtgärd
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linked.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={projectStatusVariant[project.status] ?? "gray"}>
                      {projectStatusLabel[project.status] ?? project.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnlink(project.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Ta bort koppling
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {unlinkedProjects.length > 0 && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Koppla projekt</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1"
              >
                <option value="">Välj projekt…</option>
                {unlinkedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Button onClick={handleLink} disabled={!selectedId || loading}>
                {loading ? "Kopplar…" : "Koppla projekt"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {allProjects.length === 0 && (
        <p className="text-sm text-gray-500">
          Det finns inga projekt i systemet ännu.{" "}
          <Link href="/projects/new" className="font-medium text-zinc-800 hover:underline">
            Skapa projekt
          </Link>
        </p>
      )}
    </div>
  )
}
