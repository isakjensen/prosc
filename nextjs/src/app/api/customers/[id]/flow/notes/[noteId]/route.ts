import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 })
  }

  const { id: customerId, noteId } = await params
  const note = await prisma.customerFlowNote.findFirst({
    where: { id: noteId, customerId },
  })
  if (!note) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 })
  }

  const body = await request.json()
  const data: {
    title?: string
    description?: string | null
    occurredAt?: Date
  } = {}

  if (typeof body.title === "string") {
    const t = body.title.trim()
    if (!t) {
      return NextResponse.json({ error: "Titel får inte vara tom" }, { status: 400 })
    }
    data.title = t
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") {
      data.description = null
    } else if (typeof body.description === "string") {
      data.description = body.description.trim() || null
    }
  }

  if (body.occurredAt !== undefined) {
    const d =
      typeof body.occurredAt === "string"
        ? new Date(body.occurredAt)
        : body.occurredAt instanceof Date
          ? body.occurredAt
          : null
    if (!d || Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Ogiltigt datum" }, { status: 400 })
    }
    data.occurredAt = d
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Inget att uppdatera" }, { status: 400 })
  }

  const updated = await prisma.customerFlowNote.update({
    where: { id: noteId },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 })
  }

  const { id: customerId, noteId } = await params
  const note = await prisma.customerFlowNote.findFirst({
    where: { id: noteId, customerId },
  })
  if (!note) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 })
  }

  await prisma.customerFlowNote.delete({ where: { id: noteId } })
  return NextResponse.json({ ok: true })
}
