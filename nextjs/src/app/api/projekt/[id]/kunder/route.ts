import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
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

  try {
    const link = await prisma.projectCustomer.create({
      data: {
        projektId: id,
        customerId: body.customerId,
      },
    })
    return NextResponse.json(link, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Kopplingen finns redan' }, { status: 409 })
    }
    throw e
  }
}
