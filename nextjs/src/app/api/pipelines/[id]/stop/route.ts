import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  await prisma.bolagsfaktaPipeline.update({
    where: { id },
    data: { status: 'STOPPED' },
  })

  return NextResponse.json({ ok: true, message: 'Pipeline stoppad' })
}
