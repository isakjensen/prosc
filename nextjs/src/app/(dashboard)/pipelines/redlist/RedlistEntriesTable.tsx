"use client"

import { useMemo, useState } from "react"
import { formatDateTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { FilterRemoveButton } from "./RedlistRemoveButton"

export type FilterEntryRow = {
  id: string
  namn: string
  orgNummerNormalized: string | null
  url: string | null
  nameContains: string | null
  createdAt: string
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

export function FilterEntriesTable({ entries }: { entries: FilterEntryRow[] }) {
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
        <FieldLabel>Sök i listan</FieldLabel>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök på namn, org.nr, URL, namn-matchning…"
          aria-label="Filtrera lista"
        />
        {query.trim() && (
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5">
            Visar {filtered.length} av {entries.length}
          </p>
        )}
      </div>

      <div className="panel-surface overflow-x-auto">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-zinc-500 text-sm">
            Inga filtrerade företag ännu
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-zinc-500 text-sm">
            Inga träffar för sökningen
          </div>
        ) : (
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Namn
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Org.nr
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Namn innehåller
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Bolagsfakta
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Skapad
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Åtgärd
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20 transition-colors hover:bg-amber-100/70 dark:hover:bg-amber-950/35"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-zinc-100">{row.namn}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 whitespace-nowrap">
                    {row.orgNummerNormalized ?? "–"}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 max-w-[12rem]">
                    {row.nameContains ? (
                      <code className="text-xs bg-white/60 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded text-gray-800 dark:text-zinc-200">
                        {row.nameContains}
                      </code>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-500">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline break-all"
                      >
                        {row.url}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-500">–</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <FilterRemoveButton entryId={row.id} />
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
