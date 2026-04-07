import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/kunder/[id]/outreach — list outreach for a customer
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const outreaches = await prisma.outreach.findMany({
    where: { customerId: id },
    orderBy: { scheduledAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ outreaches })
}

// POST /api/kunder/[id]/outreach — create a new outreach
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await auth()
  const body = await request.json()

  const { title, type, scheduledAt, recipients, body: outreachBody, attachments } = body

  if (!title?.trim() || !type || !scheduledAt) {
    return NextResponse.json({ error: "Titel, typ och datum krävs" }, { status: 400 })
  }

  const validTypes = ["EMAIL", "PHONE", "SMS", "PHYSICAL"]
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Ogiltig typ" }, { status: 400 })
  }

  const outreach = await prisma.outreach.create({
    data: {
      customerId: id,
      userId: session?.user?.id ?? null,
      title: title.trim(),
      type,
      scheduledAt: new Date(scheduledAt),
      recipients: recipients ? JSON.stringify(recipients) : null,
      body: outreachBody?.trim() || null,
      attachments: attachments ? JSON.stringify(attachments) : null,
    },
  })

  return NextResponse.json(outreach, { status: 201 })
}
