import { NextRequest, NextResponse } from 'next/server'
import {
  scrapingApiFetch,
  SCRAPER_TROUBLE_MESSAGE,
  isScrapingApiConfigured,
  scrapingApiNotConfiguredResponse,
} from '@/lib/scraping-api-client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  if (!isScrapingApiConfigured()) return scrapingApiNotConfiguredResponse()

  const body = await request.json().catch(() => ({})) as { orgNummer?: string }
  if (!body.orgNummer?.trim()) {
    return NextResponse.json({ error: 'orgNummer krävs' }, { status: 400 })
  }

  try {
    const res = await scrapingApiFetch(
      `/api/pipelines/${encodeURIComponent(id)}/companies/add-by-org-number`,
      {
        method: 'POST',
        body: JSON.stringify({ orgNummer: body.orgNummer.trim() }),
      },
    )

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    const clientStatus = res.status === 400 || res.status === 404 || res.status === 409
      ? res.status
      : 502
    return NextResponse.json(data, { status: clientStatus })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 })
  }
}
