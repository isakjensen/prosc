import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/ui/back-button"
import { RedlistAddForm } from "./RedlistAddForm"
import { RedlistEntriesTable, type RedlistEntryRow } from "./RedlistEntriesTable"

export default async function PipelinesRedlistPage() {
  const entries = await prisma.bolagsfaktaRedlistEntry.findMany({
    orderBy: { createdAt: "desc" },
  })

  const rows: RedlistEntryRow[] = entries.map((row) => ({
    id: row.id,
    namn: row.namn,
    orgNummerNormalized: row.orgNummerNormalized,
    url: row.url,
    nameContains: row.nameContains,
    createdAt: row.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5">
        <BackButton href="/pipelines" label="Pipeline" />
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            Redlistade företag
          </h1>
          <Badge variant="gray">{entries.length}</Badge>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Företag som inte ska tas vidare via pipeline (org.nr, URL eller automatisk namn-matchning)
        </p>
      </div>

      <RedlistAddForm />

      <RedlistEntriesTable entries={rows} />
    </div>
  )
}
