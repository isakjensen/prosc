import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: pipelineId, foretagId } = await params

  try {
    await prisma.bolagsfaktaForetag.update({
      where: { id: foretagId, pipelineId },
      data: { isHidden: false },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[unhide route] failed', e)
    return NextResponse.json({ error: 'Kunde inte visa företaget igen' }, { status: 500 })
  }
}
