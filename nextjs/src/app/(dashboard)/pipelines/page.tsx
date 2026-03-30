import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
  IDLE: 'Inaktiv',
  RUNNING: 'Körs',
  COMPLETED: 'Klar',
  STOPPED: 'Stoppad',
}

const statusVariant: Record<string, 'gray' | 'info' | 'success' | 'danger'> = {
  IDLE: 'gray',
  RUNNING: 'info',
  COMPLETED: 'success',
  STOPPED: 'danger',
}

export default async function PipelinesPage() {
  const pipelines = await prisma.pipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { results: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Pipelines</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pipelines.length} pipelines totalt</p>
        </div>
        <Link href="/pipelines/ny">
          <Button>+ Ny pipeline</Button>
        </Link>
      </div>

      <div className="panel-surface">
        {pipelines.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Inga pipelines ännu
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Namn</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Beskrivning</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Resultat</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Senast skrapad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pipelines.map((pipeline) => (
                <tr key={pipeline.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/pipelines/${pipeline.id}`}
                      className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                    >
                      {pipeline.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs">
                    <span className="line-clamp-1">{pipeline.description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {pipeline.status === 'RUNNING' && (
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      <Badge variant={statusVariant[pipeline.status] ?? 'gray'}>
                        {statusLabel[pipeline.status] ?? pipeline.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{pipeline._count.results}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(pipeline.lastScrapedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
