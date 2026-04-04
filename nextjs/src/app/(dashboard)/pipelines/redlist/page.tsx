import { prisma } from "@/lib/db"
import { formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { RedlistAddForm } from "./RedlistAddForm"
import { RedlistRemoveButton } from "./RedlistRemoveButton"

export default async function PipelinesRedlistPage() {
  const entries = await prisma.bolagsfaktaRedlistEntry.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">CRM</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <h1 className="text-2xl font-bold text-gray-900">
              Redlistade företag
            </h1>
            <Badge variant="gray">{entries.length}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Företag som inte ska tas vidare via Bolagsfakta-pipeline
          </p>
        </div>
        <Link href="/pipelines">
          <span className="text-sm text-gray-600 hover:text-gray-900">
            ← Till pipelines
          </span>
        </Link>
      </div>

      <RedlistAddForm />

      <div className="panel-surface">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Ingen redlista ännu
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Namn
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Org.nr
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
              {entries.map((row) => (
                <tr
                  key={row.id}
                  className="border-l-4 border-l-red-600 bg-red-50/90 transition-colors hover:bg-red-100/80 dark:bg-red-950/25 dark:hover:bg-red-950/40"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{row.namn}</td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {row.orgNummerNormalized ?? "–"}
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
