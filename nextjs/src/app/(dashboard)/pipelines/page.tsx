import { prisma } from '@/lib/db'
import { cn, formatDateTime } from '@/lib/utils'
import { bolagsfaktaBranschListingUrl } from '@/lib/bolagsfakta-list-url'
import { getPipelineDetailSuccessByPipelineId } from '@/lib/pipeline-table-helpers'
import PipelineListDeleteButton from './PipelineListDeleteButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PipelineForetagCountComparison } from '@/components/bolagsfakta/PipelineForetagCountComparison'
import Link from 'next/link'
import { reconcileBolagsfaktaStaleStatusViaApi } from '@/lib/scraping-api-client'

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
  await reconcileBolagsfaktaStaleStatusViaApi()

  const pipelines = await prisma.bolagsfaktaPipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { foretag: true } },
    },
  })

  const pipelineIds = pipelines.map((p) => p.id)
  const detailSuccessByPipelineId = await getPipelineDetailSuccessByPipelineId(pipelineIds)

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pipelines.length} pipelines totalt</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link href="/pipelines/redlist" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full sm:w-auto",
                "border-l-4 border-l-red-600 bg-red-50 text-red-950 hover:bg-red-100 hover:text-red-950",
                "dark:border-red-700 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60",
              )}
            >
              Redlistade företag
            </Button>
          </Link>
          <Link href="/pipelines/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">+ Ny pipeline</Button>
          </Link>
        </div>
      </div>

      <div className="panel-surface overflow-x-auto">
        {pipelines.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Inga pipelines ännu
          </div>
        ) : (
          <table className="w-full min-w-[64rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Namn</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kommun</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Bransch</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Körning</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[13rem]">
                  Listskrapning
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[14rem]">
                  Bolagsfakta / scrapeade
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Senast skrapad</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 w-14">
                  <span className="sr-only">Åtgärder</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pipelines.map((pipeline) => {
                const listCount = pipeline._count.foretag
                const detailOk = detailSuccessByPipelineId.get(pipeline.id) ?? 0
                const listTitle =
                  listCount === 0
                    ? "Inga företag i listan ännu"
                    : `${listCount} företag i listan. BF-detalj klar: ${detailOk}/${listCount}.`

                return (
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
                    <Link
                      href={`/pipelines/${pipeline.id}`}
                      className="block min-w-[11rem] max-w-[18rem]"
                      title={listTitle}
                    >
                      <span className="font-semibold tabular-nums text-gray-900">{listCount}</span>
                      <span className="text-gray-500"> i listan</span>
                      {listCount > 0 ? (
                        <p className="text-xs text-gray-400 mt-1 tabular-nums">
                          BF-detalj klar: {detailOk}/{listCount}
                        </p>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <PipelineForetagCountComparison
                      bolagsfaktaForetagCount={pipeline.bolagsfaktaForetagCount}
                      scrapedCount={pipeline._count.foretag}
                      bolagsfaktaListUrl={bolagsfaktaBranschListingUrl({
                        kommunSlug: pipeline.kommunSlug,
                        branschSlug: pipeline.branschSlug,
                        branschKod: pipeline.branschKod,
                      })}
                      compact
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDateTime(pipeline.lastScrapedAt)}</td>
                  <td className="px-4 py-4 text-right align-middle">
                    <PipelineListDeleteButton
                      pipelineId={pipeline.id}
                      pipelineNamn={pipeline.namn}
                      status={pipeline.status}
                    />
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
