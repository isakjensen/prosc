import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { runFetchDetailViaApi } from "@/lib/scraping-api-client"

interface RouteParams {
  params: Promise<{ id: string; foretagId: string }>
}

export const maxDuration = 300

/**
 * Kör full Bolagsfakta-detaljskrapning synkront tills jobbet är klart och returnerar bl.a. websiteDiscovery (Google + AI). Samma arbete som köad fetch-detail, men väntar ut resultat för direkt feedback i UI.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id: pipelineId, foretagId } = await params

  const foretag = await prisma.bolagsfaktaForetag.findFirst({
    where: { id: foretagId, pipelineId },
  })

  if (!foretag) {
    return NextResponse.json({ error: "Företaget hittades inte i pipelinen" }, { status: 404 })
  }

  if (!foretag.url) {
    return NextResponse.json({ error: "Saknar Bolagsfakta-URL" }, { status: 400 })
  }

  if (!foretag.customerId) {
    return NextResponse.json(
      { error: "Företaget saknar kopplad kund — kör om pipeline eller migrera data" },
      { status: 400 },
    )
  }

  if (foretag.detailStatus === "QUEUED" || foretag.detailStatus === "RUNNING") {
    return NextResponse.json(
      { error: "Detaljhämtning pågår redan för den här raden — vänta tills den är klar." },
      { status: 409 },
    )
  }

  return runFetchDetailViaApi(
    pipelineId,
    foretagId,
    foretag.customerId,
    foretag.url,
    { timeoutMs: 280_000, intervalMs: 1_500 },
  )
}
