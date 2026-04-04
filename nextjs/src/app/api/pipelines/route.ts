import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const pipelines = await prisma.bolagsfaktaPipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { foretag: true } },
    },
  })
  return NextResponse.json(pipelines)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.namn) return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })
  if (!body.kommunSlug) return NextResponse.json({ error: 'Kommun krävs' }, { status: 400 })
  if (!body.kommunNamn) return NextResponse.json({ error: 'Kommunnamn krävs' }, { status: 400 })
  if (!body.branschSlug) return NextResponse.json({ error: 'Bransch krävs' }, { status: 400 })
  if (!body.branschNamn) return NextResponse.json({ error: 'Branschnamn krävs' }, { status: 400 })
  if (!body.branschKod) return NextResponse.json({ error: 'Branschkod krävs' }, { status: 400 })

  const bolagsfaktaForetagCount =
    typeof body.bolagsfaktaForetagCount === 'number' && Number.isFinite(body.bolagsfaktaForetagCount)
      ? Math.trunc(body.bolagsfaktaForetagCount)
      : null

  const pipeline = await prisma.bolagsfaktaPipeline.create({
    data: {
      namn: body.namn,
      kommunSlug: body.kommunSlug,
      kommunNamn: body.kommunNamn,
      branschSlug: body.branschSlug,
      branschNamn: body.branschNamn,
      branschKod: body.branschKod,
      bolagsfaktaForetagCount,
      status: 'IDLE',
    },
  })

  return NextResponse.json(pipeline, { status: 201 })
}
