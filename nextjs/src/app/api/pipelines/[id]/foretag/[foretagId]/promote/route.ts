import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: pipelineId, foretagId } = await params

  const foretag = await prisma.bolagsfaktaForetag.findFirst({
    where: { id: foretagId, pipelineId },
    include: { customer: true },
  })

  if (!foretag) {
    return NextResponse.json({ error: 'Företaget hittades inte i pipelinen' }, { status: 404 })
  }

  if (!foretag.customerId || !foretag.customer) {
    return NextResponse.json({ error: 'Saknar kopplad kund' }, { status: 400 })
  }

  if (foretag.customer.stage !== 'SCRAPED') {
    return NextResponse.json({ error: 'Företaget är redan prospekt eller kund' }, { status: 409 })
  }

  await prisma.customer.update({
    where: { id: foretag.customerId },
    data: { stage: 'PROSPECT', promotedToProspectAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
