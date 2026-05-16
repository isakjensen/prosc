import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const schedules = await prisma.bolagsfaktaPipelineSchedule.findMany({
    where: { status: 'PENDING' },
    include: { pipeline: { select: { id: true, namn: true } } },
    orderBy: [{ scheduledAt: 'asc' }, { runOrder: 'asc' }],
  })
  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    scheduledAt?: string
    pipelineIds?: string[]
  } | null

  if (!body?.scheduledAt || !Array.isArray(body.pipelineIds) || body.pipelineIds.length === 0) {
    return NextResponse.json({ error: 'scheduledAt och pipelineIds krävs' }, { status: 400 })
  }

  const scheduledAt = new Date(body.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Ogiltigt datum' }, { status: 400 })
  }

  const entries = await prisma.$transaction(
    body.pipelineIds.map((pipelineId, index) =>
      prisma.bolagsfaktaPipelineSchedule.create({
        data: {
          pipelineId,
          scheduledAt,
          runOrder: index,
        },
      }),
    ),
  )

  return NextResponse.json({ ok: true, count: entries.length, entries })
}
