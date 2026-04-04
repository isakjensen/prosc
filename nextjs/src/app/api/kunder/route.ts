import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const customers = await prisma.customer.findMany({
    where: {
      stage: 'CUSTOMER',
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(customers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      stage: 'CUSTOMER',
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

  return NextResponse.json(customer, { status: 201 })
}
