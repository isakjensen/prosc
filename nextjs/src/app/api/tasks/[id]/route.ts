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
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'DONE') data.completedAt = new Date()
  }
  if (body.priority !== undefined) data.priority = body.priority
  if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo || null
  if (body.customerId !== undefined) data.customerId = body.customerId || null
  if (body.projectId !== undefined) data.projectId = body.projectId || null
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { assignee: true, customer: true, project: true },
  })

  return NextResponse.json(task)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
