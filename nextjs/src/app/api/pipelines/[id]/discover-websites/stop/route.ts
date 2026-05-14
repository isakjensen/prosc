import { NextResponse } from "next/server"
import { scrapingApiFetch, SCRAPER_TROUBLE_MESSAGE } from "@/lib/scraping-api-client"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params

  try {
    const res = await scrapingApiFetch(
      `/api/pipelines/${encodeURIComponent(id)}/discover-websites/stop`,
      { method: "POST" },
    )
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (res.ok) {
      return NextResponse.json(body)
    }

    return NextResponse.json(
      { error: (body.error as string) ?? SCRAPER_TROUBLE_MESSAGE },
      { status: res.status >= 500 ? 502 : res.status },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 })
  }
}
