import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  if (!body.companyId) {
    return NextResponse.json({ error: 'companyId krävs' }, { status: 400 })
  }

  const link = await prisma.projectCustomer.create({
    data: {
      projektId: id,
      companyId: body.companyId,
    },
  })

  return NextResponse.json(link, { status: 201 })
}
