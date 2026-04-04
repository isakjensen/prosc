import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { BolagsfaktaDebugLogger, getBolagsfaktaLogFilePath } from '@/lib/bolagsfakta-debug-logger'
import { persistBolagsfaktaDetail, scrapeBolagsfaktaCompanyPage } from '@/lib/bolagsfakta-detail-scraper'

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

/** Låt Playwright hinna köra (t.ex. Vercel Pro / self-hosted) */
export const maxDuration = 300

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: pipelineId, foretagId } = await params

  const foretag = await prisma.bolagsfaktaForetag.findFirst({
    where: { id: foretagId, pipelineId },
    include: { customer: true },
  })

  if (!foretag) {
    return NextResponse.json({ error: 'Företaget hittades inte i pipelinen' }, { status: 404 })
  }

  if (!foretag.url) {
    return NextResponse.json({ error: 'Saknar Bolagsfakta-URL' }, { status: 400 })
  }

  if (!foretag.customerId) {
    return NextResponse.json({ error: 'Företaget saknar kopplad kund — kör om pipeline eller migrera data' }, { status: 400 })
  }

  const debugLogger = new BolagsfaktaDebugLogger({
    pipelineId,
    foretagId,
    customerId: foretag.customerId,
    bolagsfaktaUrl: foretag.url,
  })

  try {
    await debugLogger.info('api_fetch_detail_start', {
      namn: foretag.namn,
      logFile: getBolagsfaktaLogFilePath(),
    })
    const parsed = await scrapeBolagsfaktaCompanyPage(foretag.url, debugLogger)
    await persistBolagsfaktaDetail(foretag.customerId, parsed, debugLogger)
    await debugLogger.info('api_fetch_detail_ok', {})
    return NextResponse.json({
      ok: true,
      debugLogFile: getBolagsfaktaLogFilePath(),
      sessionId: debugLogger.sessionId,
      websiteDiscovery: parsed.websiteDiscovery ?? null,
    })
  } catch (e) {
    console.error('[fetch-detail]', e)
    await debugLogger.error('api_fetch_detail_failed', {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Kunde inte hämta Bolagsfakta',
        debugLogFile: getBolagsfaktaLogFilePath(),
        sessionId: debugLogger.sessionId,
      },
      { status: 500 },
    )
  }
}
