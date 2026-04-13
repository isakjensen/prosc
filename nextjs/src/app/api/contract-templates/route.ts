import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const templates = await prisma.contractTemplate.findMany({
    include: { _count: { select: { contracts: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const template = await prisma.contractTemplate.create({
    data: {
      name: body.name,
      description: body.description || null,
      content: body.content,
      variables: body.variables ? JSON.stringify(body.variables) : null,
    },
  })

  return NextResponse.json(template, { status: 201 })
}
