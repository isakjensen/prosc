export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { cn, formatDateTime } from '@/lib/utils'
import { bolagsfaktaBranschListingUrl } from '@/lib/bolagsfakta-list-url'
import { getPipelineDetailSuccessByPipelineId } from '@/lib/pipeline-table-helpers'
import PipelineListDeleteButton from './PipelineListDeleteButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { reconcileBolagsfaktaStaleStatusViaApi } from '@/lib/scraping-api-client'
import { ShieldAlert, Building2, Database, Zap, GitBranch, ExternalLink } from 'lucide-react'

const statusLabel: Record<string, string> = {
  IDLE: 'Ej startad',
  RUNNING: 'Skrapar…',
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
    include: { _count: { select: { foretag: true } } },
  })

  const pipelineIds = pipelines.map((p) => p.id)
  const detailSuccessByPipelineId = await getPipelineDetailSuccessByPipelineId(pipelineIds)

  const totalCompanies = pipelines.reduce((s, p) => s + p._count.foretag, 0)
  const totalDetailOk = [...detailSuccessByPipelineId.values()].reduce((s, v) => s + v, 0)
  const runningCount = pipelines.filter((p) => p.status === 'RUNNING').length

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="page-hero pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="page-kicker">CRM</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-0.5">Pipeline</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              Företagsdata hämtad direkt från Bolagsfakta
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link href="/pipelines/redlist" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-full sm:w-auto gap-2',
                  'border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100',
                  'dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60',
                )}
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Filtrerade
              </Button>
            </Link>
            <Link href="/pipelines/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">+ Ny pipeline</Button>
            </Link>
          </div>
        </div>

        {/* Statistik-chips */}
        {pipelines.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-5">
            <div className="hero-chip">
              <span className="hero-chip__icon">
                <GitBranch className="h-5 w-5" />
              </span>
              <div>
                <p className="hero-chip__label">Pipelines</p>
                <p className="hero-chip__value">{pipelines.length}</p>
              </div>
            </div>
            <div className="hero-chip">
              <span className="hero-chip__icon hero-chip__icon--emerald">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="hero-chip__label">Företag totalt</p>
                <p className="hero-chip__value">{totalCompanies.toLocaleString('sv')}</p>
              </div>
            </div>
            <div className="hero-chip">
              <span className="hero-chip__icon hero-chip__icon--blue">
                <Database className="h-5 w-5" />
              </span>
              <div>
                <p className="hero-chip__label">Med bolagsdata</p>
                <p className="hero-chip__value">{totalDetailOk.toLocaleString('sv')}</p>
              </div>
            </div>
            {runningCount > 0 && (
              <div className="hero-chip">
                <span className="hero-chip__icon hero-chip__icon--violet">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <p className="hero-chip__label">Aktiva just nu</p>
                  <p className="hero-chip__value">{runningCount}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tomt tillstånd */}
      {pipelines.length === 0 && (
        <div className="panel-surface flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-gray flex items-center justify-center">
            <GitBranch className="h-7 w-7 text-brand-brown/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Inga pipelines ännu</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
              Skapa din första pipeline för att börja hämta företagsdata.
            </p>
          </div>
          <Link href="/pipelines/new">
            <Button>+ Skapa pipeline</Button>
          </Link>
        </div>
      )}

      {/* Pipeline-kort */}
      {pipelines.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pipelines.map((pipeline) => {
            const listCount = pipeline._count.foretag
            const detailOk = detailSuccessByPipelineId.get(pipeline.id) ?? 0
            const detailPct = listCount > 0 ? Math.round((detailOk / listCount) * 100) : 0
            const isRunning = pipeline.status === 'RUNNING'
            const bolagsfaktaUrl = bolagsfaktaBranschListingUrl({
              kommunSlug: pipeline.kommunSlug,
              branschSlug: pipeline.branschSlug,
              branschKod: pipeline.branschKod,
            })

            return (
              <div
                key={pipeline.id}
                className={cn(
                  'panel-surface lift-card flex flex-col overflow-hidden',
                  isRunning && 'ring-1 ring-green-300/60 dark:ring-green-700/30',
                )}
              >
                {/* Statuslinje i toppen */}
                <div
                  className={cn(
                    'h-[3px] w-full',
                    isRunning
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : pipeline.status === 'COMPLETED'
                        ? 'bg-gradient-to-r from-brand-green to-brand-green/50'
                        : pipeline.status === 'STOPPED'
                          ? 'bg-gradient-to-r from-red-400 to-red-300'
                          : 'bg-gray-200 dark:bg-zinc-700',
                  )}
                />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Header: namn + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/pipelines/${pipeline.id}`} className="group/name">
                        <h3 className="font-semibold text-gray-900 dark:text-zinc-100 group-hover/name:text-brand-brown transition-colors leading-snug line-clamp-2">
                          {pipeline.namn}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">
                        {pipeline.kommunNamn}
                        {pipeline.branschNamn && (
                          <> · <span className="line-clamp-1 inline">{pipeline.branschNamn}</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {isRunning && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                      )}
                      <Badge variant={statusVariant[pipeline.status] ?? 'gray'}>
                        {statusLabel[pipeline.status] ?? pipeline.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Statistik */}
                  {listCount > 0 ? (
                    <div className="flex items-end gap-4">
                      <div className="shrink-0">
                        <p className="text-[2rem] font-bold tabular-nums text-gray-900 dark:text-zinc-100 leading-none tracking-tight">
                          {listCount.toLocaleString('sv')}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 font-medium uppercase tracking-wide">
                          Företag
                        </p>
                      </div>
                      <div className="flex-1 min-w-0 pb-0.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Bolagsdata</span>
                          <span className="text-[11px] font-bold tabular-nums text-gray-700 dark:text-zinc-300">
                            {detailPct}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              detailPct === 100 ? 'bg-brand-green' : 'bg-brand-brown',
                            )}
                            style={{ width: `${detailPct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                          {detailOk.toLocaleString('sv')} av {listCount.toLocaleString('sv')} hämtade
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-3">
                      <p className="text-xs text-gray-400 dark:text-zinc-500 italic">Inga företag ännu — starta scraping</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800 mt-auto">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                        {pipeline.lastScrapedAt
                          ? formatDateTime(pipeline.lastScrapedAt)
                          : 'Ej körts'}
                      </span>
                      {bolagsfaktaUrl && (
                        <a
                          href={bolagsfaktaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-gray-300 dark:text-zinc-600 hover:text-brand-brown transition-colors"
                          title="Öppna på Bolagsfakta"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/pipelines/${pipeline.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-3">
                          Öppna
                        </Button>
                      </Link>
                      <PipelineListDeleteButton
                        pipelineId={pipeline.id}
                        pipelineNamn={pipeline.namn}
                        status={pipeline.status}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
