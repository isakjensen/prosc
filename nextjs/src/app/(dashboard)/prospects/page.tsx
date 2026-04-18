import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ProspektViews from './ProspektViews'

export default async function ProspektsPage() {
  const [stages, companies] = await Promise.all([
    prisma.prospectStage.findMany({ orderBy: { order: 'asc' } }),
    prisma.customer.findMany({
      where: { stage: 'PROSPECT' },
      include: {
        prospectStage: { include: { currentStage: true } },
        contacts: { select: { id: true } },
        bolagsfaktaData: { select: { discoveredWebsite: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Group by stage for board view
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
      companies: noStage.map(serialize),
    },
    ...stages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color ?? '#3b82f6',
      companies: (byStage[s.id] ?? []).map(serialize),
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
        <Link href="/prospects/new">
          <Button>+ Nytt prospekt</Button>
        </Link>
      </div>

      <ProspektViews
        columns={allColumns}
        companies={companies.map(serialize)}
        stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      />
    </div>
  )
}

function serialize(c: {
  id: string
  name: string
  industry: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  contacts: { id: string }[]
  bolagsfaktaData: { discoveredWebsite: string | null } | null
  prospectStage: {
    currentStageId: string
    currentStage: { id: string; name: string; color: string | null }
  } | null
}) {
  const website =
    c.website?.trim() || c.bolagsfaktaData?.discoveredWebsite?.trim() || null
  return {
    id: c.id,
    name: c.name,
    industry: c.industry,
    city: c.city,
    phone: c.phone,
    email: c.email,
    website,
    contacts: c.contacts,
    prospectStage: c.prospectStage
      ? {
          currentStageId: c.prospectStage.currentStageId,
          currentStage: {
            id: c.prospectStage.currentStage.id,
            name: c.prospectStage.currentStage.name,
            color: c.prospectStage.currentStage.color,
          },
        }
      : null,
  }
}
