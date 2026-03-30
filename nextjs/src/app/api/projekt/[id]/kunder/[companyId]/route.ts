import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; companyId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, companyId } = await params

  await prisma.projectCustomer.deleteMany({
    where: {
      projektId: id,
      companyId,
    },
  })

  return NextResponse.json({ ok: true })
}
