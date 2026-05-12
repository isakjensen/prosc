import { prisma } from "@/lib/db"
import { formatDateTime, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, ShieldAlert } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import PipelineActions from "./PipelineActions"
import { type PipelineForetagRow } from "./PipelineForetagTable"
import PipelineForetagBatchPanel from "./PipelineForetagBatchPanel"
import PipelineForetagPanelHeading from "./PipelineForetagPanelHeading"
import PipelineLiveStatus from "./PipelineLiveStatus"
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

  // Fire-and-forget — blockerar inte sidladdning
  void reconcileBolagsfaktaStaleStatusViaApi(id)

  const EF_BOLAGSFORMS = ['enskild firma', 'enskild näringsidkare']

  const [pipeline, activeDetailCount, filteredForetagCount] = await Promise.all([
    prisma.bolagsfaktaPipeline.findUnique({
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
    }),
    prisma.bolagsfaktaForetag.count({
      where: { pipelineId: id, detailStatus: { in: ["QUEUED", "RUNNING"] } },
    }),
    prisma.bolagsfaktaForetag.count({
      where: {
        pipelineId: id,
        isRedlisted: false,
        bolagsform: { notIn: EF_BOLAGSFORMS },
      },
    }),
  ])

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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <BackButton href="/pipelines" label="Pipeline" />

        {/* Titel + åtgärder */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{pipeline.namn}</h1>
              {pipeline.status === 'COMPLETED' && activeDetailCount > 0 ? (
                <Badge variant="info">Hämtar data…</Badge>
              ) : (
                <Badge variant={statusVariant[pipeline.status] ?? 'gray'}>
                  {statusLabel[pipeline.status] ?? pipeline.status}
                </Badge>
              )}
            </div>

            {/* Metadata-rad */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>
                <span className="text-gray-400">Kommun: </span>
                <span className="font-medium text-gray-600">{pipeline.kommunNamn}</span>
              </span>
              <span className="text-gray-300" aria-hidden>·</span>
              <span>
                <span className="text-gray-400">Bransch: </span>
                <span className="font-medium text-gray-600">{pipeline.branschNamn}</span>
              </span>
              {pipeline.lastScrapedAt && (
                <>
                  <span className="text-gray-300" aria-hidden>·</span>
                  <span>
                    <span className="text-gray-400">Skrapad: </span>
                    <time
                      dateTime={pipeline.lastScrapedAt.toISOString()}
                      className="font-medium text-gray-600 tabular-nums"
                    >
                      {formatDateTime(pipeline.lastScrapedAt)}
                    </time>
                  </span>
                </>
              )}
              {bolagsfaktaListUrl && (
                <>
                  <span className="text-gray-300" aria-hidden>·</span>
                  <a
                    href={bolagsfaktaListUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-brown hover:underline underline-offset-2"
                  >
                    Bolagsfakta
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/pipelines/redlist">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2",
                  "border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100",
                  "dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60",
                )}
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Filtrerade
              </Button>
            </Link>
            <PipelineActions pipelineId={id} status={pipeline.status} hasActiveDetailJobs={activeDetailCount > 0} foretagCount={pipeline._count.foretag} />
          </div>
        </div>
      </div>

      {/* Live status (scraping pågår) */}
      <PipelineLiveStatus
        pipelineId={id}
        initialStatus={pipeline.status}
        initialForetagCount={pipeline._count.foretag}
        bolagsfaktaForetagCount={pipeline.bolagsfaktaForetagCount}
        initialActiveDetailCount={activeDetailCount}
      />

      {/* Klar-banner */}
      {activeDetailCount === 0 && (
        <PipelineScrapeCompleteBanner
          status={pipeline.status}
          listForetagCount={pipeline._count.foretag}
        />
      )}

      {/* Antal-jämförelse */}
      <PipelineForetagCountComparison
        bolagsfaktaForetagCount={pipeline.bolagsfaktaForetagCount}
        scrapedCount={filteredForetagCount}
        bolagsfaktaListUrl={bolagsfaktaListUrl}
        showBolagsfaktaListLink={false}
      />

      {/* Företagstabell */}
      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <PipelineForetagPanelHeading
            pipelineId={id}
            initialTotalCount={pipeline._count.foretag}
            pipelineStatus={pipeline.status}
          />
          {pipeline._count.foretag > 100 && (
            <span className="text-xs text-gray-400 shrink-0">Visar de 100 senaste</span>
          )}
        </div>
        {pipeline.foretag.length === 0 && pipeline.status !== "RUNNING" ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-brand-gray flex items-center justify-center">
              <svg className="h-6 w-6 text-brand-brown/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Inga företag ännu</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Klicka "Starta scraping" för att hämta företag från Bolagsfakta.</p>
            </div>
          </div>
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
