import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.title !== undefined) data.title = body.title
  if (body.notes !== undefined) data.notes = body.notes
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

  const invoice = await prisma.invoice.update({
    where: { id },
    data,
    include: { customer: true, lineItems: true, payments: true },
  })

  return NextResponse.json(invoice)
}
