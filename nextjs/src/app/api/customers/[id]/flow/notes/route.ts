import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null
  const occurredRaw = body.occurredAt

  if (!title) {
    return NextResponse.json({ error: "Titel krävs" }, { status: 400 })
  }

  const occurredAt =
    typeof occurredRaw === "string"
      ? new Date(occurredRaw)
      : occurredRaw instanceof Date
        ? occurredRaw
        : new Date()
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Ogiltigt datum" }, { status: 400 })
  }

  const note = await prisma.customerFlowNote.create({
    data: {
      customerId,
      userId: session.user.id,
      title,
      description,
      occurredAt,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
