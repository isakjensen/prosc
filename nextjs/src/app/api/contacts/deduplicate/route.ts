import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { buildContactDedupePlan } from "@/lib/contact-dedupe"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let dryRun = true
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.dryRun === "boolean") dryRun = body.dryRun
  } catch {
    dryRun = true
  }

  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      customerId: true,
      firstName: true,
      lastName: true,
      title: true,
      role: true,
      email: true,
      createdAt: true,
    },
  })

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true },
    where: { id: { in: [...new Set(contacts.map((c) => c.customerId))] } },
  })
  const customerNameById = new Map(customers.map((c) => [c.id, c.name]))

  const { plan, idsToDelete } = buildContactDedupePlan(contacts, customerNameById)

  if (dryRun || idsToDelete.length === 0) {
    return NextResponse.json({
      dryRun: true,
      plan,
      removedCount: idsToDelete.length,
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.activity.updateMany({
      where: { contactId: { in: idsToDelete } },
      data: { contactId: null },
    })
    await tx.meetingAttendee.updateMany({
      where: { contactId: { in: idsToDelete } },
      data: { contactId: null },
    })
    await tx.contact.deleteMany({
      where: { id: { in: idsToDelete } },
    })
  })

  return NextResponse.json({
    dryRun: false,
    plan,
    removedCount: idsToDelete.length,
  })
}
