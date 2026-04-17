import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/outreach/[id] — update an outreach item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const existing = await prisma.outreach.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Outreach hittades inte" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (body.status && ["PLANNED", "COMPLETED"].includes(body.status)) {
    data.status = body.status
  }
  if (body.title !== undefined) data.title = body.title
  if (body.type !== undefined) data.type = body.type
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt)
  if (body.recipients !== undefined) {
    data.recipients = body.recipients ? JSON.stringify(body.recipients) : null
  }
  if (body.body !== undefined) data.body = body.body
  if (body.attachments !== undefined) {
    data.attachments = body.attachments ? JSON.stringify(body.attachments) : null
  }
  if (body.subject !== undefined) data.subject = body.subject || null
  if (body.sendAt !== undefined) data.sendAt = body.sendAt ? new Date(body.sendAt) : null

  const updated = await prisma.outreach.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/outreach/[id] — delete an outreach item
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const existing = await prisma.outreach.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Outreach hittades inte" }, { status: 404 })
  }

  await prisma.outreach.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
