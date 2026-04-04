import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const tickets = await prisma.supportTicket.findMany({
    include: { customer: true, creator: true, assignee: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tickets)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
  }

  const body = await request.json()

  const ticket = await prisma.supportTicket.create({
    data: {
      customerId: body.customerId,
      title: body.title,
      description: body.description,
      status: 'OPEN',
      priority: body.priority || 'MEDIUM',
      createdById: session.user.id,
      assignedToId: body.assignedToId || null,
    },
  })

  return NextResponse.json(ticket, { status: 201 })
}
