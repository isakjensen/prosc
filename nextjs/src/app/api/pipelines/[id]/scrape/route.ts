import { NextRequest } from 'next/server'
import { runPipelineScrapeViaApi } from '@/lib/scraping-api-client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return runPipelineScrapeViaApi(id)
}
