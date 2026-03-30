import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const prospects = await prisma.company.findMany({
    where: {
      type: 'PROSPECT',
      ...(q ? { name: { contains: q } } : {}),
    },
    include: {
      prospectStage: {
        include: { currentStage: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(prospects)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const company = await prisma.company.create({
    data: {
      name: body.name,
      type: 'PROSPECT',
      industry: body.industry || null,
      website: body.website || null,
      address: body.address || null,
      city: body.city || null,
      zip: body.zip || null,
      country: body.country || null,
      phone: body.phone || null,
      email: body.email || null,
      notes: body.notes || null,
    },
  })

  return NextResponse.json(company, { status: 201 })
}
