import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          activities: true,
          systemLogs: true,
          tasks: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Användaren hittades inte' }, { status: 404 })
  }

  const lastActivity = await prisma.activity.findFirst({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return NextResponse.json({
    ...user,
    lastActivity: lastActivity?.createdAt ?? null,
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'Användaren hittades inte' }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) {
    if (body.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: body.email } })
      if (existing) {
        return NextResponse.json({ error: 'E-postadressen används redan' }, { status: 409 })
      }
    }
    data.email = body.email
  }
  if (body.role !== undefined) data.role = body.role
  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 10)
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}
