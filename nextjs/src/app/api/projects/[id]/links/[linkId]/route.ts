import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string; linkId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: projektId, linkId } = await params

  await prisma.projectLink.deleteMany({
    where: {
      id: linkId,
      projektId,
    },
  })

  return NextResponse.json({ ok: true })
}
