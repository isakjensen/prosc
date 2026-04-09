import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.startTime !== undefined) data.startTime = new Date(body.startTime)
  if (body.endTime !== undefined) data.endTime = new Date(body.endTime)
  if (body.location !== undefined) data.location = body.location || null
  if (body.videoLink !== undefined) data.videoLink = body.videoLink || null
  if (body.notes !== undefined) data.notes = body.notes || null
  if (body.customerId !== undefined) data.customerId = body.customerId || null
  if (body.projectId !== undefined) data.projectId = body.projectId || null

  const meeting = await prisma.meeting.update({
    where: { id },
    data,
    include: {
      customer: true,
      project: true,
      attendees: { include: { user: true, contact: true } },
    },
  })

  return NextResponse.json(meeting)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  await prisma.meeting.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
