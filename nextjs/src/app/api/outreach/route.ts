import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/outreach — list all outreach with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") ?? ""
  const type = searchParams.get("type")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: Record<string, unknown> = {}
  const conditions: Record<string, unknown>[] = []

  if (q) {
    conditions.push({
      OR: [
        { title: { contains: q } },
        { customer: { name: { contains: q } } },
      ],
    })
  }

  if (type && ["EMAIL", "PHONE", "SMS", "PHYSICAL"].includes(type)) {
    conditions.push({ type })
  }

  if (status && ["PLANNED", "COMPLETED"].includes(status)) {
    conditions.push({ status })
  }

  if (from) {
    conditions.push({ scheduledAt: { gte: new Date(from) } })
  }

  if (to) {
    conditions.push({ scheduledAt: { lte: new Date(to + "T23:59:59") } })
  }

  if (conditions.length > 0) {
    where.AND = conditions
  }

  const outreaches = await prisma.outreach.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, city: true, industry: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  })

  return NextResponse.json({ outreaches })
}
