import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { flowKindToOverrideType, type FlowItemKind } from "@/lib/customer-flow"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

const flowKinds: FlowItemKind[] = [
  "meeting",
  "quote",
  "bolagsfakta_scrape",
  "customer_record",
  "prospect_milestone",
  "activity",
]

function isFlowKind(s: string): s is FlowItemKind {
  return flowKinds.includes(s as FlowItemKind)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 })
  }

  const { id: customerId } = await params
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  })
  if (!customer) {
    return NextResponse.json({ error: "Kunden hittades inte" }, { status: 404 })
  }

  const body = await request.json()
  const kind = typeof body.kind === "string" ? body.kind : ""
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : ""
  const occurredRaw = body.occurredAt

  if (!isFlowKind(kind)) {
    return NextResponse.json({ error: "Ogiltig kind" }, { status: 400 })
  }
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId krävs" }, { status: 400 })
  }

  const sourceType = flowKindToOverrideType(kind)
  if (!sourceType) {
    return NextResponse.json({ error: "Kind stöder inte datumoverride" }, { status: 400 })
  }

  const occurredAt =
    typeof occurredRaw === "string" ? new Date(occurredRaw) : occurredRaw instanceof Date ? occurredRaw : null
  if (!occurredAt || Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Ogiltigt occurredAt" }, { status: 400 })
  }

  await prisma.customerFlowOccurredAtOverride.upsert({
    where: {
      customerId_sourceType_sourceId: {
        customerId,
        sourceType,
        sourceId,
      },
    },
    create: {
      customerId,
      sourceType,
      sourceId,
      occurredAt,
    },
    update: {
      occurredAt,
    },
  })

  return NextResponse.json({ ok: true })
}
