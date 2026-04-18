import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deletePipelineCascade } from '@/lib/delete-pipeline-cascade'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id },
    include: {
      foretag: { orderBy: [{ isRedlisted: 'asc' }, { createdAt: 'desc' }], take: 100 },
      _count: { select: { foretag: true } },
    },
  })

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  return NextResponse.json(pipeline)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const result = await deletePipelineCascade(prisma, id)
  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Pipeline körs — stoppa den innan du tar bort den.' },
      { status: 409 },
    )
  }
  return NextResponse.json({ deleted: true, deletedCustomerCount: result.deletedCustomerCount })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const pipeline = await prisma.bolagsfaktaPipeline.update({
    where: { id },
    data: {
      ...(body.namn !== undefined && { namn: body.namn }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })

  return NextResponse.json(pipeline)
}
