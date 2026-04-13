import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const meetings = await prisma.meeting.findMany({
    include: {
      customer: true,
      project: true,
      attendees: { include: { user: true, contact: true } },
    },
    orderBy: { startTime: 'desc' },
  })

  return NextResponse.json(meetings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const meeting = await prisma.meeting.create({
    data: {
      title: body.title,
      description: body.description || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      location: body.location || null,
      videoLink: body.videoLink || null,
      notes: body.notes || null,
      customerId: body.customerId || null,
      projectId: body.projectId || null,
    },
    include: {
      customer: true,
      project: true,
      attendees: { include: { user: true, contact: true } },
    },
  })

  return NextResponse.json(meeting, { status: 201 })
}
