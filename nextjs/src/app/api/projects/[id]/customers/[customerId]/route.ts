import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; customerId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, customerId } = await params

  await prisma.projectCustomer.deleteMany({
    where: {
      projektId: id,
      customerId,
    },
  })

  return NextResponse.json({ ok: true })
}
