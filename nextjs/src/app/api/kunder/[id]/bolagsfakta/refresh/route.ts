import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { BolagsfaktaDebugLogger, getBolagsfaktaLogFilePath } from '@/lib/bolagsfakta-debug-logger'
import { persistBolagsfaktaDetail, scrapeBolagsfaktaCompanyPage } from '@/lib/bolagsfakta-detail-scraper'
import { searchBolagsfaktaByOrgNumber } from '@/lib/bolagsfakta-search'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const maxDuration = 300

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: customerId } = await params

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      bolagsfaktaData: true,
      bolagsfaktaForetag: {
        where: { url: { not: null } },
        take: 1,
      },
    },
  })

  if (!customer) {
    return NextResponse.json({ error: 'Kunden hittades inte' }, { status: 404 })
  }

  let url =
    customer.bolagsfaktaData?.sourceUrl?.trim() ||
    customer.bolagsfaktaForetag[0]?.url?.trim() ||
    null

  if (!url && customer.orgNumber) {
    url = await searchBolagsfaktaByOrgNumber(customer.orgNumber)
  }

  if (!url) {
    return NextResponse.json(
      { error: 'Saknar Bolagsfakta-URL och organisationsnummer — kan inte söka på Bolagsfakta' },
      { status: 400 },
    )
  }

  const debugLogger = new BolagsfaktaDebugLogger({
    customerId,
    bolagsfaktaUrl: url,
  })

  try {
    await debugLogger.info('api_customer_bolagsfakta_refresh_start', {
      logFile: getBolagsfaktaLogFilePath(),
    })
    const parsed = await scrapeBolagsfaktaCompanyPage(url, debugLogger)
    await persistBolagsfaktaDetail(customerId, parsed, debugLogger)
    await debugLogger.info('api_customer_bolagsfakta_refresh_ok', {})
    return NextResponse.json({
      ok: true,
      debugLogFile: getBolagsfaktaLogFilePath(),
      sessionId: debugLogger.sessionId,
      websiteDiscovery: parsed.websiteDiscovery ?? null,
    })
  } catch (e) {
    console.error('[kunder/bolagsfakta/refresh]', e)
    await debugLogger.error('api_customer_bolagsfakta_refresh_failed', {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Kunde inte uppdatera Bolagsfakta',
        debugLogFile: getBolagsfaktaLogFilePath(),
        sessionId: debugLogger.sessionId,
      },
      { status: 500 },
    )
  }
}
