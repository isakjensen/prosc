import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

/** PROSPECT → SCRAPED (pipeline) från pipeline-vyn. */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id: pipelineId, foretagId } = await params

  const foretag = await prisma.bolagsfaktaForetag.findFirst({
    where: { id: foretagId, pipelineId },
    include: { customer: true },
  })

  if (!foretag) {
    return NextResponse.json({ error: "Företaget hittades inte i pipelinen" }, { status: 404 })
  }

  if (!foretag.customerId || !foretag.customer) {
    return NextResponse.json({ error: "Saknar kopplad kund" }, { status: 400 })
  }

  if (foretag.customer.stage !== "PROSPECT") {
    return NextResponse.json(
      {
        error:
          "Endast prospekt kan läggas tillbaka i pipeline. Är bolaget redan kund eller pipeline-rad, använd andra åtgärder.",
      },
      { status: 409 },
    )
  }

  await prisma.$transaction([
    prisma.prospectStageHistory.deleteMany({ where: { customerId: foretag.customerId } }),
    prisma.customer.update({
      where: { id: foretag.customerId },
      data: { stage: "SCRAPED", promotedToProspectAt: null },
    }),
  ])

  return NextResponse.json({ ok: true })
}
