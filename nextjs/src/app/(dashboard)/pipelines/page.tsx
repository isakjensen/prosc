import { prisma } from '@/lib/db'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PipelineForetagCountComparison } from '@/components/bolagsfakta/PipelineForetagCountComparison'
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
  const pipelines = await prisma.bolagsfaktaPipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { foretag: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Bolagsfakta Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pipelines.length} pipelines totalt</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/pipelines/redlist">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "border-l-4 border-l-red-600 bg-red-50 text-red-950 hover:bg-red-100 hover:text-red-950",
                "dark:border-red-700 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60",
              )}
            >
              Redlistade företag
            </Button>
          </Link>
          <Link href="/pipelines/new">
            <Button>+ Ny pipeline</Button>
          </Link>
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kommun</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Bransch</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[14rem]">
                  Bolagsfakta / scrapeade
                </th>
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
                      {pipeline.namn}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{pipeline.kommunNamn}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs">
                    <span className="line-clamp-1">{pipeline.branschNamn}</span>
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
                  <td className="px-6 py-4">
                    <PipelineForetagCountComparison
                      bolagsfaktaForetagCount={pipeline.bolagsfaktaForetagCount}
                      scrapedCount={pipeline._count.foretag}
                      compact
                    />
                  </td>
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
