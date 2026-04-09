import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  const category = request.nextUrl.searchParams.get('category')

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [{ title: { contains: q } }, { content: { contains: q } }]
  }
  if (category) {
    where.category = category
  }

  const articles = await prisma.knowledgeBase.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(articles)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const article = await prisma.knowledgeBase.create({
    data: {
      title: body.title,
      content: body.content,
      category: body.category || null,
      tags: body.tags ? JSON.stringify(body.tags) : null,
      published: body.published ?? false,
    },
  })

  return NextResponse.json(article, { status: 201 })
}
