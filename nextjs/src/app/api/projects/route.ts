import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          customers: true,
          features: true,
        },
      },
    },
  })

  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description || null,
      status: body.status || 'ACTIVE',
    },
  })

  return NextResponse.json(project, { status: 201 })
}
