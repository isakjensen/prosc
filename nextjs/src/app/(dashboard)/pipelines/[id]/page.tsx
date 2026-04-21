import { prisma } from "@/lib/db"
import { formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, ExternalLink } from "lucide-react"
import PipelineActions from "./PipelineActions"
import { type PipelineForetagRow } from "./PipelineForetagTable"
import PipelineForetagBatchPanel from "./PipelineForetagBatchPanel"
import PipelineForetagPanelHeading from "./PipelineForetagPanelHeading"
import PipelineLiveRefresh from "./PipelineLiveRefresh"
import PipelineScrapeCompleteBanner from "./PipelineScrapeCompleteBanner"
import { PipelineForetagCountComparison } from "@/components/bolagsfakta/PipelineForetagCountComparison"
import { bolagsfaktaBranschListingUrl } from "@/lib/bolagsfakta-list-url"
import { reconcileBolagsfaktaStaleStatusViaApi } from "@/lib/scraping-api-client"

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

  await reconcileBolagsfaktaStaleStatusViaApi(id)

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id },
    include: {
      foretag: {
        orderBy: [{ isRedlisted: "asc" }, { createdAt: "desc" }],
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
    website:
      f.customer?.website?.trim() ||
      f.customer?.bolagsfaktaData?.discoveredWebsite?.trim() ||
      null,
    customerId: f.customerId,
    customerStage: f.customer?.stage ?? null,
    hasBolagsfakta: f.customer?.bolagsfaktaData != null,
    bolagsfaktaUpdatedAt: f.customer?.bolagsfaktaData?.updatedAt?.toISOString() ?? null,
    isRedlisted: f.isRedlisted,
    omsattning: f.customer?.bolagsfaktaData?.omsattningSenaste ?? null,
    ebitda: f.customer?.bolagsfaktaData?.ebitdaSenaste ?? null,
    aretsResultat: f.customer?.bolagsfaktaData?.aretsResultatSenaste ?? null,
    detailStatus: f.detailStatus,
    detailJobId: f.detailJobId,
    detailQueuedAt: f.detailQueuedAt?.toISOString() ?? null,
    detailStartedAt: f.detailStartedAt?.toISOString() ?? null,
    detailFinishedAt: f.detailFinishedAt?.toISOString() ?? null,
    detailError: f.detailError,
  }))

  const hasActiveDetailJobs = pipeline.foretag.some(
    (f) => f.detailStatus === "QUEUED" || f.detailStatus === "RUNNING",
  )

  const bolagsfaktaListUrl = bolagsfaktaBranschListingUrl({
    kommunSlug: pipeline.kommunSlug,
    branschSlug: pipeline.branschSlug,
    branschKod: pipeline.branschKod,
  })

  return (
    <div className="space-y-6">
      <PipelineLiveRefresh status={pipeline.status} hasActiveDetailJobs={hasActiveDetailJobs} />
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/pipelines" className="hover:text-gray-600 transition-colors">Pipeline</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{pipeline.namn}</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{pipeline.namn}</h1>
                <div className="flex items-center gap-2">
                  {pipeline.status === 'RUNNING' && (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-green animate-pulse" />
                  )}
                  <Badge variant={statusVariant[pipeline.status] ?? 'gray'}>
                    {statusLabel[pipeline.status] ?? pipeline.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-gray-500 sm:gap-x-3">
                <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
                  <span className="shrink-0 text-gray-400">Senast skrapad:</span>{" "}
                  {pipeline.lastScrapedAt ? (
                    <time
                      dateTime={pipeline.lastScrapedAt.toISOString()}
                      className="font-medium text-gray-600 tabular-nums"
                    >
                      {formatDateTime(pipeline.lastScrapedAt)}
                    </time>
                  ) : (
                    <span className="text-gray-400">–</span>
                  )}
                </span>
                <span
                  className="hidden text-gray-300 sm:inline sm:shrink-0"
                  aria-hidden
                >
                  ·
                </span>
                <span className="min-w-0 sm:max-w-[min(100%,28rem)]">
                  <span className="text-gray-400">Kommun:</span>{" "}
                  <span className="text-gray-600">{pipeline.kommunNamn}</span>
                </span>
                <span
                  className="hidden text-gray-300 sm:inline sm:shrink-0"
                  aria-hidden
                >
                  ·
                </span>
                <span className="min-w-0 basis-full sm:basis-auto sm:max-w-none">
                  <span className="text-gray-400">Bransch:</span>{" "}
                  <span className="text-gray-600">
                    {pipeline.branschKod} – {pipeline.branschNamn}
                  </span>
                </span>
                {bolagsfaktaListUrl ? (
                  <>
                    <span
                      className="hidden text-gray-300 sm:inline sm:shrink-0"
                      aria-hidden
                    >
                      ·
                    </span>
                    <a
                      href={bolagsfaktaListUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex basis-full items-center gap-1.5 font-medium text-gray-700 underline decoration-gray-400 underline-offset-2 hover:text-gray-900 hover:decoration-gray-600 sm:basis-auto"
                    >
                      Öppna fullständig företagslista på Bolagsfakta
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                  </>
                ) : null}
              </div>
            </div>
            <PipelineActions pipelineId={id} status={pipeline.status} />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5">
            <PipelineScrapeCompleteBanner
              status={pipeline.status}
              listForetagCount={pipeline._count.foretag}
            />
            <PipelineForetagCountComparison
              bolagsfaktaForetagCount={pipeline.bolagsfaktaForetagCount}
              scrapedCount={pipeline._count.foretag}
              bolagsfaktaListUrl={bolagsfaktaListUrl}
              showBolagsfaktaListLink={false}
            />
          </div>
        </div>
      </div>

      {/* Resultat */}
      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <PipelineForetagPanelHeading
            pipelineId={id}
            initialTotalCount={pipeline._count.foretag}
            pipelineStatus={pipeline.status}
          />
          {pipeline._count.foretag > 100 && (
            <span className="text-sm text-gray-400 shrink-0">Visar de 100 senaste i tabellen</span>
          )}
        </div>
        {pipeline.foretag.length === 0 && pipeline.status !== "RUNNING" ? (
          <p className="px-6 py-6 text-sm text-gray-400">
            Inga företag ännu. Starta scraping för att hämta företag från Bolagsfakta.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <PipelineForetagBatchPanel
              pipelineId={id}
              pipelineStatus={pipeline.status}
              listForetagTotal={pipeline._count.foretag}
              rows={foretagRows}
            />
          </div>
        )}
      </div>
    </div>
  )
}
