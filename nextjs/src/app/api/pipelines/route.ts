import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const pipelines = await prisma.pipeline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { results: true },
      },
    },
  })

  return NextResponse.json(pipelines)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })
  }

  if (!body.description) {
    return NextResponse.json({ error: 'Beskrivning krävs' }, { status: 400 })
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      name: body.name,
      description: body.description,
      status: 'IDLE',
    },
  })

  return NextResponse.json(pipeline, { status: 201 })
}
