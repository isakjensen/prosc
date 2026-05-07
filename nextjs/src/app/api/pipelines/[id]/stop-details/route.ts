import { NextRequest, NextResponse } from 'next/server'
import { stopDetailJobsViaApi } from '@/lib/scraping-api-client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return stopDetailJobsViaApi(id)
}
