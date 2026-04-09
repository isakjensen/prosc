import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { assignee: true, customer: true, project: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description || null,
      status: body.status || 'TODO',
      priority: body.priority || 'MEDIUM',
      assignedTo: body.assignedTo || null,
      customerId: body.customerId || null,
      projectId: body.projectId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
