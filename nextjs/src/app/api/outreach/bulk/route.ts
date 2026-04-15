import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { OutreachType, OutreachStatus } from "@prisma/client"

// POST /api/outreach/bulk — bulk create outreach for multiple customers
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 })
  }

  const body = await request.json()
  const { customerIds, type, title, outreachBody, startDate, endDate, perDay, subject, emailTemplateId } = body

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return NextResponse.json({ error: "Välj minst ett prospekt" }, { status: 400 })
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: "Titel krävs" }, { status: 400 })
  }

  const validTypes = ["EMAIL", "PHONE", "SMS", "PHYSICAL"]
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Ogiltig typ" }, { status: 400 })
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Start- och slutdatum krävs" }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start > end) {
    return NextResponse.json({ error: "Startdatum måste vara före slutdatum" }, { status: 400 })
  }

  const maxPerDay = Math.max(1, Math.floor(Number(perDay) || 5))

  // Generate weekdays between start and end
  const days: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  if (days.length === 0) {
    return NextResponse.json({ error: "Inga vardagar i valt datumintervall" }, { status: 400 })
  }

  // Distribute customers across days
  const records: {
    customerId: string
    userId: string
    title: string
    type: OutreachType
    scheduledAt: Date
    body: string | null
    subject: string | null
    emailTemplateId: string | null
    status: OutreachStatus
  }[] = []

  let customerIndex = 0
  for (const day of days) {
    if (customerIndex >= customerIds.length) break
    const count = Math.min(maxPerDay, customerIds.length - customerIndex)
    for (let i = 0; i < count; i++) {
      records.push({
        customerId: customerIds[customerIndex],
        userId: session.user.id,
        title: title.trim(),
        type: type as OutreachType,
        scheduledAt: day,
        body: outreachBody?.trim() || null,
        subject: type === "EMAIL" ? (subject?.trim() || null) : null,
        emailTemplateId: type === "EMAIL" ? (emailTemplateId || null) : null,
        status: "PLANNED" as OutreachStatus,
      })
      customerIndex++
    }
  }

  await prisma.outreach.createMany({ data: records })

  return NextResponse.json({ created: records.length }, { status: 201 })
}
