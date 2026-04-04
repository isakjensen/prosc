import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

function normalizeUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) {
    try {
      new URL(t)
      return t
    } catch {
      return null
    }
  }
  const withProto = `https://${t}`
  try {
    new URL(withProto)
    return withProto
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projektId } = await params
  const body = await request.json()
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const urlRaw = typeof body.url === "string" ? body.url : ""

  if (!title) {
    return NextResponse.json({ error: "Titel krävs" }, { status: 400 })
  }
  const url = normalizeUrl(urlRaw)
  if (!url) {
    return NextResponse.json({ error: "Ogiltig webbadress" }, { status: 400 })
  }

  const maxOrder = await prisma.projectLink.aggregate({
    where: { projektId },
    _max: { sortOrder: true },
  })
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1

  const link = await prisma.projectLink.create({
    data: {
      projektId,
      title,
      url,
      sortOrder,
    },
  })

  return NextResponse.json(link, { status: 201 })
}
