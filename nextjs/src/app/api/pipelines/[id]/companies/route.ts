import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id },
    include: {
      foretag: {
        orderBy: [{ isRedlisted: "asc" }, { createdAt: "desc" }],
        take: 100,
        include: {
          customer: {
            include: {
              bolagsfaktaData: true,
            },
          },
        },
      },
      _count: { select: { foretag: true } },
    },
  })

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline hittades inte" }, { status: 404 })
  }

  const rows = pipeline.foretag.map((f) => ({
    id: f.id,
    namn: f.namn,
    adress: f.adress,
    orgNummer: f.orgNummer,
    bolagsform: f.bolagsform,
    url: f.url,
    website:
      f.customer?.website?.trim() ||
      f.customer?.bolagsfaktaData?.discoveredWebsite?.trim() ||
      null,
    customerId: f.customerId,
    customerStage: f.customer?.stage ?? null,
    hasBolagsfakta: f.customer?.bolagsfaktaData != null,
    bolagsfaktaUpdatedAt: f.customer?.bolagsfaktaData?.updatedAt?.toISOString() ?? null,
    isRedlisted: f.isRedlisted,
    detailStatus: f.detailStatus,
    detailJobId: f.detailJobId,
    detailQueuedAt: f.detailQueuedAt,
    detailStartedAt: f.detailStartedAt,
    detailFinishedAt: f.detailFinishedAt,
    detailError: f.detailError,
  }))

  return NextResponse.json({
    pipelineId: pipeline.id,
    pipelineStatus: pipeline.status,
    totalCount: pipeline._count.foretag,
    rows,
  })
}

