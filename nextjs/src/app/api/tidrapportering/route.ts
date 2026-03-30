import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const entries = await prisma.timeEntry.findMany({
    include: { user: true },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
  }

  const body = await request.json()

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      taskId: body.taskId || null,
      description: body.description,
      hours: parseFloat(body.hours),
      date: body.date ? new Date(body.date) : new Date(),
      billable: body.billable ?? true,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
