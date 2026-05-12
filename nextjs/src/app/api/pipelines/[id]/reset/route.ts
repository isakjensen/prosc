import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline hittades inte" }, { status: 404 })
  }

  if (pipeline.status === "RUNNING") {
    return NextResponse.json(
      { error: "Pipeline körs — stoppa den innan du återställer den." },
      { status: 409 },
    )
  }

  const deleted = await prisma.bolagsfaktaForetag.deleteMany({
    where: { pipelineId: id },
  })

  await prisma.bolagsfaktaPipeline.update({
    where: { id },
    data: {
      status: "IDLE",
      lastScrapedAt: null,
      scrapeCurrentPage: null,
      scrapeCurrentUrl: null,
    },
  })

  return NextResponse.json({
    reset: true,
    deletedForetagCount: deleted.count,
  })
}
