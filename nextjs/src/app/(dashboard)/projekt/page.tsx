import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Aktiv',
  PAUSED: 'Pausad',
  ARCHIVED: 'Arkiverad',
}

const statusVariant: Record<string, 'success' | 'warning' | 'gray'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'gray',
}

export default async function ProjektPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          customers: true,
          links: true,
          features: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Affär</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Projekt</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projekt totalt</p>
        </div>
        <Link href="/projekt/ny">
          <Button>+ Nytt projekt</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="panel-surface p-16 text-center">
          <p className="text-gray-400 text-lg font-medium">Inga projekt ännu</p>
          <p className="text-gray-400 text-sm mt-1">Skapa ditt första projekt för att komma igång</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projekt/${project.id}`}>
              <div className="panel-surface lift-card cursor-pointer h-full p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">
                    {project.name}
                  </h2>
                  <Badge variant={statusVariant[project.status] ?? 'gray'}>
                    {statusLabel[project.status] ?? project.status}
                  </Badge>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
                  <span>
                    <span className="font-semibold text-gray-700">{project._count.customers}</span>{' '}
                    {project._count.customers === 1 ? 'kund' : 'kunder'}
                  </span>
                  <span>
                    <span className="font-semibold text-gray-700">{project._count.links}</span>{' '}
                    {project._count.links === 1 ? 'länk' : 'länkar'}
                  </span>
                  <span>
                    <span className="font-semibold text-gray-700">{project._count.features}</span>{' '}
                    {project._count.features === 1 ? 'funktion' : 'funktioner'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
