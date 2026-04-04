import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  if (!body.customerId) {
    return NextResponse.json({ error: 'customerId krävs' }, { status: 400 })
  }

  const link = await prisma.projectCustomer.create({
    data: {
      projektId: id,
      customerId: body.customerId,
    },
  })

  return NextResponse.json(link, { status: 201 })
}
