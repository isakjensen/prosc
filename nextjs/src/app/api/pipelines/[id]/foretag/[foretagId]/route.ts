import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

/**
 * Tar bort raden från pipelinen. Om en CRM-kund är kopplad raderas hela Customer
 * (kontakter, Bolagsfakta-data, m.m. enligt schema). Annars bara pipeline-raden.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id: pipelineId, foretagId } = await params

  const foretag = await prisma.bolagsfaktaForetag.findFirst({
    where: { id: foretagId, pipelineId },
  })

  if (!foretag) {
    return NextResponse.json({ error: 'Företaget hittades inte i pipelinen' }, { status: 404 })
  }

  try {
    if (foretag.customerId) {
      const customerId = foretag.customerId
      await prisma.$transaction(async (tx) => {
        await tx.bolagsfaktaForetag.deleteMany({ where: { customerId } })
        await tx.customer.delete({ where: { id: customerId } })
      })
    } else {
      await prisma.bolagsfaktaForetag.delete({ where: { id: foretagId } })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[pipelines/foretag DELETE]', e)
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Kunde inte ta bort — kontrollera om det finns kvar data som blockerar radering.',
      },
      { status: 500 },
    )
  }
}
