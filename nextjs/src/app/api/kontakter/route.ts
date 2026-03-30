import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const contacts = await prisma.contact.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {},
    include: { company: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  return NextResponse.json(contacts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const contact = await prisma.contact.create({
    data: {
      companyId: body.companyId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      title: body.title || null,
      notes: body.notes || null,
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
