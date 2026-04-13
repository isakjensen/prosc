import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
  })

  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const items: Array<{ key: string; value: string }> = body.settings ?? []

  const results = await Promise.all(
    items.map((item) =>
      prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      }),
    ),
  )

  return NextResponse.json(results)
}
