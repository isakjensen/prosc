import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const entry = await prisma.bolagsfaktaPipelineSchedule.findUnique({ where: { id } })
  if (!entry) {
    return NextResponse.json({ error: 'Hittas inte' }, { status: 404 })
  }
  if (entry.status === 'RUNNING') {
    return NextResponse.json({ error: 'Kan inte avbryta ett jobb som redan körs' }, { status: 409 })
  }

  await prisma.bolagsfaktaPipelineSchedule.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ ok: true })
}
