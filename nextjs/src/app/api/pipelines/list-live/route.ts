import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const pipelines = await prisma.bolagsfaktaPipeline.findMany({
    select: {
      id: true,
      status: true,
      _count: { select: { foretag: true } },
    },
  })

  const pipelineIds = pipelines.map((p) => p.id)

  const detailGroups = pipelineIds.length
    ? await prisma.bolagsfaktaForetag.groupBy({
        by: ['pipelineId', 'detailStatus'],
        where: { pipelineId: { in: pipelineIds } },
        _count: { _all: true },
      })
    : []

  const detailOkByPipelineId = new Map<string, number>()
  const activeDetailByPipelineId = new Map<string, number>()
  for (const g of detailGroups) {
    if (g.detailStatus === 'SUCCESS') {
      detailOkByPipelineId.set(g.pipelineId, g._count._all)
    }
    if (g.detailStatus === 'QUEUED' || g.detailStatus === 'RUNNING') {
      activeDetailByPipelineId.set(
        g.pipelineId,
        (activeDetailByPipelineId.get(g.pipelineId) ?? 0) + g._count._all,
      )
    }
  }

  const result = pipelines.map((p) => ({
    id: p.id,
    status: p.status,
    foretagCount: p._count.foretag,
    detailOkCount: detailOkByPipelineId.get(p.id) ?? 0,
    activeDetailCount: activeDetailByPipelineId.get(p.id) ?? 0,
  }))

  return NextResponse.json(result)
}
