import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const pipeline = await prisma.pipeline.findUnique({ where: { id } })
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  // Update status to RUNNING
  await prisma.pipeline.update({
    where: { id },
    data: { status: 'RUNNING' },
  })

  // Actual scraping logic lives in the Svelte app and is not ported here.
  // This endpoint signals intent and returns 200 OK.
  return NextResponse.json({ ok: true, message: 'Scraping startad' })
}
