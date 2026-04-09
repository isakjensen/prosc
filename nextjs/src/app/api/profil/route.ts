import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return NextResponse.json({
    ...user,
    lastActivity: lastActivity?.createdAt ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const body = await request.json()
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
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

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: 'Nuvarande lösenord krävs' }, { status: 400 })
    }
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Felaktigt nuvarande lösenord' }, { status: 403 })
    }
    data.passwordHash = await bcrypt.hash(body.newPassword, 10)
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
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
