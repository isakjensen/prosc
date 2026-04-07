import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) {
    return NextResponse.json({ error: 'Kontakten hittades inte' }, { status: 404 })
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      firstName: body.firstName ?? contact.firstName,
      lastName: body.lastName ?? contact.lastName,
      email: body.email !== undefined ? (body.email || null) : contact.email,
      phone: body.phone !== undefined ? (body.phone || null) : contact.phone,
      title: body.title !== undefined ? (body.title || null) : contact.title,
      role: body.role !== undefined ? (body.role || null) : contact.role,
      notes: body.notes !== undefined ? (body.notes || null) : contact.notes,
    },
  })

  return NextResponse.json(updated)
}
