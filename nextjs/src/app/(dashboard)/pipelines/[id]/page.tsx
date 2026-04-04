import { prisma } from "@/lib/db"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import PipelineActions from "./PipelineActions"
import PipelineForetagTable, { type PipelineForetagRow } from "./PipelineForetagTable"
import PipelineLiveRefresh from "./PipelineLiveRefresh"
import { PipelineForetagCountComparison } from "@/components/bolagsfakta/PipelineForetagCountComparison"

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

export default async function PipelineDetailPage({ params }: PageProps) {
  const { id } = await params

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id },
    include: {
      foretag: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customer: {
            include: {
              bolagsfaktaData: true,
            },
          },
        },
      },
      _count: { select: { foretag: true } },
    },
  })

  if (!pipeline) notFound()

  const foretagRows: PipelineForetagRow[] = pipeline.foretag.map((f) => ({
    id: f.id,
    namn: f.namn,
    adress: f.adress,
    orgNummer: f.orgNummer,
    bolagsform: f.bolagsform,
    url: f.url,
    customerId: f.customerId,
    customerStage: f.customer?.stage ?? null,
    hasBolagsfakta: f.customer?.bolagsfaktaData != null,
    isRedlisted: f.isRedlisted,
  }))

  return (
    <div className="space-y-6">
      <PipelineLiveRefresh status={pipeline.status} />
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/pipelines" className="hover:text-gray-600 transition-colors">Bolagsfakta Pipeline</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{pipeline.namn}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{pipeline.namn}</h1>
              <div className="flex items-center gap-2">
                {pipeline.status === 'RUNNING' && (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <Badge variant={statusVariant[pipeline.status] ?? 'gray'}>
                  {statusLabel[pipeline.status] ?? pipeline.status}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
              <span><span className="text-gray-400">Kommun:</span> {pipeline.kommunNamn}</span>
              <span><span className="text-gray-400">Bransch:</span> {pipeline.branschKod} – {pipeline.branschNamn}</span>
            </div>
          </div>
          <PipelineActions pipelineId={id} status={pipeline.status} />
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PipelineForetagCountComparison
          bolagsfaktaForetagCount={pipeline.bolagsfaktaForetagCount}
          scrapedCount={pipeline._count.foretag}
        />
        <div className="hero-chip sm:max-w-xs">
          <div className="min-w-0">
            <div className="hero-chip__value text-sm font-semibold">{formatDate(pipeline.lastScrapedAt)}</div>
            <div className="hero-chip__label">Senast skrapad</div>
          </div>
        </div>
      </div>

      {/* Resultat */}
      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Företag ({pipeline._count.foretag})</h2>
          {pipeline._count.foretag > 100 && (
            <span className="text-sm text-gray-400">Visar de 100 senaste</span>
          )}
        </div>
        {pipeline.foretag.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">
            Inga företag ännu. Starta scraping för att hämta företag från Bolagsfakta.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <PipelineForetagTable pipelineId={id} rows={foretagRows} />
          </div>
        )}
      </div>
    </div>
  )
}
