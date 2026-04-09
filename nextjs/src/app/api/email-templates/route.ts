import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const template = await prisma.emailTemplate.create({
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      variables: body.variables ? JSON.stringify(body.variables) : null,
    },
  })

  return NextResponse.json(template, { status: 201 })
}
