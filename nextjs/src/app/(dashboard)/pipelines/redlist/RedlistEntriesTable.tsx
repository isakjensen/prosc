"use client"

import { useMemo, useState } from "react"
import { formatDateTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { RedlistRemoveButton } from "./RedlistRemoveButton"

export type RedlistEntryRow = {
  id: string
  namn: string
  orgNummerNormalized: string | null
  url: string | null
  nameContains: string | null
  createdAt: string
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}
    </label>
  )
}

export function RedlistEntriesTable({ entries }: { entries: RedlistEntryRow[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((row) => {
      const hay = [
        row.namn,
        row.orgNummerNormalized ?? "",
        row.url ?? "",
        row.nameContains ?? "",
        formatDateTime(row.createdAt),
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [entries, query])

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <FieldLabel>Filtrera lista</FieldLabel>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök på namn, org.nr, URL, namn-matchning…"
          aria-label="Filtrera redlista"
        />
        {query.trim() && (
          <p className="text-xs text-gray-500 mt-1.5">
            Visar {filtered.length} av {entries.length}
          </p>
        )}
      </div>

      <div className="panel-surface overflow-x-auto">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Ingen redlista ännu
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Inga träffar för filtret
          </div>
        ) : (
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Namn
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Org.nr
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Namn innehåller
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Bolagsfakta
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Skapad
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Åtgärd
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-l-4 border-l-red-600 bg-red-50/90 transition-colors hover:bg-red-100/80 dark:bg-red-950/25 dark:hover:bg-red-950/40"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{row.namn}</td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {row.orgNummerNormalized ?? "–"}
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-[12rem]">
                    {row.nameContains ? (
                      <code className="text-xs bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded">
                        {row.nameContains}
                      </code>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-700 hover:text-zinc-900 underline-offset-2 hover:underline break-all"
                      >
                        {row.url}
                      </a>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RedlistRemoveButton entryId={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
