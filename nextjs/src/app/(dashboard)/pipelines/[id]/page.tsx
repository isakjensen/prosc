import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import PipelineActions from './PipelineActions'
import ResultsTable from './ResultsTable'

interface PageProps {
  params: Promise<{ id: string }>
}

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

const resultStatusLabel: Record<string, string> = {
  FOUND: 'Hittad',
  ENRICHING: 'Berikar',
  ENRICHED: 'Berikad',
  ANALYZING: 'Analyserar',
  ANALYZED: 'Analyserad',
}

const resultStatusVariant: Record<string, 'gray' | 'info' | 'success' | 'warning' | 'danger'> = {
  FOUND: 'gray',
  ENRICHING: 'info',
  ENRICHED: 'success',
  ANALYZING: 'info',
  ANALYZED: 'success',
}

export default async function PipelineDetailPage({ params }: PageProps) {
  const { id } = await params

  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: {
        select: { results: true },
      },
    },
  })

  if (!pipeline) notFound()

  const enrichedCount = await prisma.pipelineResult.count({
    where: {
      pipelineId: id,
      status: { in: ['ENRICHED', 'ANALYZING', 'ANALYZED'] },
    },
  })

  const analyzedCount = await prisma.pipelineResult.count({
    where: {
      pipelineId: id,
      status: 'ANALYZED',
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/pipelines" className="hover:text-gray-600 transition-colors">Pipelines</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{pipeline.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{pipeline.name}</h1>
              <div className="flex items-center gap-2">
                {pipeline.status === 'RUNNING' && (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <Badge variant={statusVariant[pipeline.status] ?? 'gray'}>
                  {statusLabel[pipeline.status] ?? pipeline.status}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">{pipeline.description}</p>
          </div>
          <PipelineActions
            pipelineId={id}
            status={pipeline.status}
          />
        </div>
      </div>

      {/* Varning om enrichStopped */}
      {pipeline.enrichStopped && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-start gap-3">
          <span className="text-yellow-600 text-lg">⚠</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">Berikning stoppad</p>
            <p className="text-sm text-yellow-700">
              Berikningen av resultat har stoppats. Starta om för att fortsätta.
            </p>
          </div>
        </div>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Totalt resultat', value: pipeline._count.results },
          { label: 'Berikade', value: enrichedCount },
          { label: 'Analyserade', value: analyzedCount },
        ].map(({ label, value }) => (
          <div key={label} className="hero-chip">
            <div className="min-w-0">
              <div className="hero-chip__value">{value}</div>
              <div className="hero-chip__label">{label}</div>
            </div>
          </div>
        ))}
        <div className="hero-chip">
          <div className="min-w-0">
            <div className="hero-chip__value text-sm font-semibold">{formatDate(pipeline.lastScrapedAt)}</div>
            <div className="hero-chip__label">Senast skrapad</div>
            {pipeline.lastEnrichedAt && (
              <div className="text-xs text-gray-400 mt-0.5">Berikad: {formatDate(pipeline.lastEnrichedAt)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Resultat */}
      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Resultat ({pipeline._count.results})</h2>
          {pipeline._count.results > 50 && (
            <span className="text-sm text-gray-400">Visar de 50 senaste</span>
          )}
        </div>
        {pipeline.results.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">
            Inga resultat ännu. Starta scraping för att börja prospektera.
          </p>
        ) : (
          <ResultsTable
            results={pipeline.results.map((r) => ({
              id: r.id,
              businessName: r.businessName,
              address: r.address,
              category: r.category,
              website: r.website,
              orgNumber: r.orgNumber,
              employeeCount: r.employeeCount,
              revenueKSEK: r.revenueKSEK,
              status: r.status,
              phone: r.phone,
              email: r.email,
              rating: r.rating,
              reviewCount: r.reviewCount,
              googleMapsUrl: r.googleMapsUrl,
              enrichmentData: r.enrichmentData,
              aiAnalysis: r.aiAnalysis,
            }))}
            totalCount={pipeline._count.results}
            resultStatusLabel={resultStatusLabel}
            resultStatusVariant={resultStatusVariant}
          />
        )}
      </div>
    </div>
  )
}
