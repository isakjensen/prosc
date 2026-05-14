import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const EF_BOLAGSFORMS = ['enskild firma', 'enskild näringsidkare']

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const [pipeline, activeDetailCount, totalDetailCount, validForetagCount, avgDetailResult] = await Promise.all([
    prisma.bolagsfaktaPipeline.findUnique({
      where: { id },
      select: {
        status: true,
        scrapeStartedAt: true,
        lastScrapedAt: true,
        scrapeCurrentPage: true,
        scrapeCurrentUrl: true,
        bolagsfaktaForetagCount: true,
        _count: { select: { foretag: true } },
      },
    }),
    prisma.bolagsfaktaForetag.count({
      where: { pipelineId: id, detailStatus: { in: ['QUEUED', 'RUNNING'] } },
    }),
    prisma.bolagsfaktaForetag.count({
      where: { pipelineId: id, detailStatus: { not: 'IDLE' } },
    }),
    prisma.bolagsfaktaForetag.count({
      where: {
        pipelineId: id,
        isRedlisted: false,
        bolagsform: { notIn: EF_BOLAGSFORMS },
      },
    }),
    prisma.$queryRaw<[{ avg_ms: number | null }]>`
      SELECT AVG(TIMESTAMPDIFF(SECOND, detailStartedAt, detailFinishedAt) * 1000) as avg_ms
      FROM bolagsfakta_foretag
      WHERE pipelineId = ${id}
        AND detailStartedAt IS NOT NULL
        AND detailFinishedAt IS NOT NULL
    `,
  ])

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  const avgDetailDurationMs = avgDetailResult[0]?.avg_ms != null
    ? Math.round(avgDetailResult[0].avg_ms)
    : null

  return NextResponse.json({
    status: pipeline.status,
    scrapeStartedAt: pipeline.scrapeStartedAt?.toISOString() ?? null,
    lastScrapedAt: pipeline.lastScrapedAt?.toISOString() ?? null,
    scrapeCurrentPage: pipeline.scrapeCurrentPage,
    scrapeCurrentUrl: pipeline.scrapeCurrentUrl,
    bolagsfaktaForetagCount: pipeline.bolagsfaktaForetagCount,
    foretagCount: pipeline._count.foretag,
    validForetagCount,
    activeDetailCount,
    totalDetailCount,
    avgDetailDurationMs,
  })
}
