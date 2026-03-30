import { prisma } from '@/lib/db'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProspektsPage() {
  const [stages, companies] = await Promise.all([
    prisma.prospectStage.findMany({ orderBy: { order: 'asc' } }),
    prisma.company.findMany({
      where: { type: 'PROSPECT' },
      include: {
        prospectStage: { include: { currentStage: true } },
        contacts: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Group by stage
  const noStage = companies.filter((c) => !c.prospectStage)
  const byStage: Record<string, typeof companies> = {}
  for (const stage of stages) {
    byStage[stage.id] = companies.filter(
      (c) => c.prospectStage?.currentStageId === stage.id,
    )
  }

  const allColumns = [
    {
      id: 'ingen',
      name: 'Ingen fas',
      color: '#94a3b8',
      companies: noStage,
    },
    ...stages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color ?? '#3b82f6',
      companies: byStage[s.id] ?? [],
    })),
  ]

  const totalProspects = companies.length

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Prospekts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalProspects} prospekts totalt</p>
        </div>
        <Link href="/prospekts/ny">
          <Button>+ Nytt prospekt</Button>
        </Link>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {allColumns.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <span className="font-medium text-sm text-gray-700">{col.name}</span>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {col.companies.length}
              </span>
            </div>

            <div className="space-y-3">
              {col.companies.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  Inga prospekts
                </div>
              ) : (
                col.companies.map((company) => (
                  <div key={company.id} className="panel-surface p-4">
                    <Link href={`/prospekts/${company.id}`}>
                      <h3 className="font-medium text-gray-900 hover:text-zinc-700 text-sm">
                        {company.name}
                      </h3>
                    </Link>
                    {company.industry && (
                      <p className="text-xs text-gray-400 mt-0.5">{company.industry}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {company.city && (
                        <span className="text-xs text-gray-500">{company.city}</span>
                      )}
                      {company.contacts.length > 0 && (
                        <Badge variant="gray">
                          {company.contacts.length} kontakt{company.contacts.length !== 1 ? 'er' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
