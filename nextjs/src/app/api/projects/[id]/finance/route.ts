import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const entries = await prisma.projectFinanceEntry.findMany({
    where: { projektId: id },
    orderBy: { startDate: 'desc' },
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  if (!body.description || !body.type || body.amount === undefined) {
    return NextResponse.json({ error: 'Beskrivning, typ och belopp krävs' }, { status: 400 })
  }

  const entry = await prisma.projectFinanceEntry.create({
    data: {
      projektId: id,
      type: body.type,
      category: body.category || null,
      description: body.description,
      amount: parseFloat(body.amount),
      vatRate: body.vatRate !== undefined ? parseFloat(body.vatRate) : 0.25,
      isRecurring: body.isRecurring === true || body.isRecurring === 'true',
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
