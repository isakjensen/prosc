import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  return NextResponse.json(pipeline)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.enrichStopped !== undefined && { enrichStopped: body.enrichStopped }),
    },
  })

  return NextResponse.json(pipeline)
}
