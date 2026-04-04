import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scrapeBolagsfaktaPipeline } from '@/lib/bolagsfakta-scraper'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline hittades inte' }, { status: 404 })
  }

  if (pipeline.status === 'RUNNING') {
    return NextResponse.json({ error: 'Pipeline körs redan' }, { status: 409 })
  }

  await prisma.bolagsfaktaPipeline.update({
    where: { id },
    data: { status: 'RUNNING' },
  })

  // Fire-and-forget
  scrapeBolagsfaktaPipeline(id).catch(err => {
    console.error(`[scrape route] Fel för pipeline ${id}:`, err)
    prisma.bolagsfaktaPipeline.update({ where: { id }, data: { status: 'STOPPED' } }).catch(() => {})
  })

  return NextResponse.json({ ok: true, message: 'Scraping startad' })
}
