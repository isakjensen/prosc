export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { cn } from '@/lib/utils'
import { getPipelineDetailSuccessByPipelineId } from '@/lib/pipeline-table-helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { reconcileBolagsfaktaStaleStatusViaApi } from '@/lib/scraping-api-client'
import { ShieldAlert, Building2, Database, Zap, GitBranch } from 'lucide-react'
import PipelineStatusFilter, { DEFAULT_VISIBLE } from './PipelineStatusFilter'
import PipelineListClient from './PipelineListClient'
import type { PipelineListItem } from './PipelineListClient'

interface PageProps {
  searchParams: Promise<{ show?: string }>
}

export default async function PipelinesPage({ searchParams }: PageProps) {
  await reconcileBolagsfaktaStaleStatusViaApi()

  const { show } = await searchParams

  const validStatuses = new Set(['RUNNING', 'IDLE', 'COMPLETED', 'STOPPED'])
  const visibleStatuses: string[] = show
    ? show.split(',').filter((s) => validStatuses.has(s))
    : DEFAULT_VISIBLE

  // Fallback if all invalid
  const effectiveVisible = visibleStatuses.length > 0 ? visibleStatuses : DEFAULT_VISIBLE

  const pipelines = await prisma.bolagsfaktaPipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { foretag: true } } },
  })

  const pipelineIds = pipelines.map((p) => p.id)
  const detailSuccessByPipelineId = await getPipelineDetailSuccessByPipelineId(pipelineIds)

  const totalCompanies = pipelines.reduce((s, p) => s + p._count.foretag, 0)
  const totalDetailOk = [...detailSuccessByPipelineId.values()].reduce((s, v) => s + v, 0)
  const runningCount = pipelines.filter((p) => p.status === 'RUNNING').length

  const statusCounts: Record<string, number> = {}
  for (const p of pipelines) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
  }

  const clientPipelines: PipelineListItem[] = pipelines.map((p) => ({
    id: p.id,
    namn: p.namn,
    kommunNamn: p.kommunNamn,
    branschNamn: p.branschNamn,
    kommunSlug: p.kommunSlug,
    branschSlug: p.branschSlug,
    branschKod: p.branschKod,
    status: p.status,
    lastScrapedAt: p.lastScrapedAt,
    foretagCount: p._count.foretag,
    detailOkCount: detailSuccessByPipelineId.get(p.id) ?? 0,
  }))

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

        {/* Status filter */}
        {pipelines.length > 0 && (
          <PipelineStatusFilter counts={statusCounts} visibleStatuses={effectiveVisible} />
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

      {/* Pipeline-kort (client component med live-polling) */}
      {pipelines.length > 0 && (
        <PipelineListClient
          initialPipelines={clientPipelines}
          visibleStatuses={effectiveVisible}
        />
      )}
    </div>
  )
}
