import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { activities: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: 'Namn och e-post krävs' },
      { status: 400 },
    )
  }

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'E-postadressen används redan' },
      { status: 409 },
    )
  }

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      role: body.role || 'MEMBER',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
