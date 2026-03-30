import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const features = await prisma.projectFeature.findMany({
    where: { projektId: id },
    orderBy: { order: 'asc' },
    include: {
      subtasks: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(features)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })
  }

  // Get max order
  const lastFeature = await prisma.projectFeature.findFirst({
    where: { projektId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const feature = await prisma.projectFeature.create({
    data: {
      projektId: id,
      name: body.name,
      description: body.description || null,
      status: body.status || 'PLANNING',
      priority: body.priority || 'MEDIUM',
      order: (lastFeature?.order ?? -1) + 1,
    },
  })

  return NextResponse.json(feature, { status: 201 })
}
