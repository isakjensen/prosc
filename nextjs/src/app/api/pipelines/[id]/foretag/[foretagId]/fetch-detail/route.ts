import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { queueFetchDetailViaApi } from '@/lib/scraping-api-client'

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

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
    return NextResponse.json(
      { error: 'Företaget saknar kopplad kund — kör om pipeline eller migrera data' },
      { status: 400 },
    )
  }

  return queueFetchDetailViaApi(
    pipelineId,
    foretagId,
    foretag.customerId,
    foretag.url,
  )
}
