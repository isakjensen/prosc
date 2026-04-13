import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; featureId: string; subtaskId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { subtaskId } = await params
  const body = await request.json()

  const subtask = await prisma.projectSubtask.update({
    where: { id: subtaskId },
    data: {
      completed: body.completed,
      completedAt: body.completed ? new Date() : null,
    },
  })

  return NextResponse.json(subtask)
}
