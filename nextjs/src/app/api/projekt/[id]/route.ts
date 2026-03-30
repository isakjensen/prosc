import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customers: {
        include: { company: true },
      },
      features: {
        orderBy: { order: 'asc' },
        include: {
          subtasks: { orderBy: { order: 'asc' } },
        },
      },
      boardColumns: {
        orderBy: { order: 'asc' },
        include: {
          cards: { orderBy: { order: 'asc' } },
        },
      },
      financeEntries: {
        orderBy: { startDate: 'desc' },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projektet hittades inte' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  await prisma.project.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
