import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const [pipeline, activeDetailCount, totalDetailCount] = await Promise.all([
    prisma.bolagsfaktaPipeline.findUnique({
      where: { id },
      select: {
        status: true,
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
  ])

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  return NextResponse.json({
    status: pipeline.status,
    scrapeCurrentPage: pipeline.scrapeCurrentPage,
    scrapeCurrentUrl: pipeline.scrapeCurrentUrl,
    bolagsfaktaForetagCount: pipeline.bolagsfaktaForetagCount,
    foretagCount: pipeline._count.foretag,
    activeDetailCount,
    totalDetailCount,
  })
}
