import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { normalizeOrgNumber, orgNumberLookupVariants } from "@/lib/swedish-org-number"

export async function GET() {
  const entries = await prisma.bolagsfaktaRedlistEntry.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 })
  }

  // Mode A: pipeline-action can POST { foretagId } to both flag the row and
  // upsert an entry in the global redlist table.
  if (typeof body.foretagId === "string" && body.foretagId.trim()) {
    const foretagId = body.foretagId.trim()

    const foretag = await prisma.bolagsfaktaForetag.findUnique({
      where: { id: foretagId },
      include: { customer: true },
    })
    if (!foretag) {
      return NextResponse.json({ error: "Företaget hittades inte" }, { status: 404 })
    }

    const url = foretag.url?.trim() || null
    const orgNorm = normalizeOrgNumber(foretag.orgNummer) ?? normalizeOrgNumber(foretag.customer?.orgNumber)
    const namn =
      (foretag.customer?.name?.trim() || foretag.namn?.trim() || "").trim()

    if (!namn) {
      return NextResponse.json({ error: "Namn krävs" }, { status: 400 })
    }

    // Flag pipeline row regardless of whether we can store a global entry
    await prisma.bolagsfaktaForetag.update({
      where: { id: foretagId },
      data: { isRedlisted: true },
    })

    // Upsert global entry when we have url or org
    const orgVars = orgNumberLookupVariants(orgNorm)
    const orFilters: Prisma.BolagsfaktaRedlistEntryWhereInput[] = []
    if (url) orFilters.push({ url })
    if (orgVars.length) orFilters.push({ orgNummerNormalized: { in: orgVars } })

    if (orFilters.length === 0) {
      return NextResponse.json({ ok: true, flagged: true, entry: null })
    }

    const existing = await prisma.bolagsfaktaRedlistEntry.findFirst({
      where: { OR: orFilters },
    })
    if (existing) {
      return NextResponse.json({ ok: true, flagged: true, entry: existing, duplicate: true })
    }

    try {
      const entry = await prisma.bolagsfaktaRedlistEntry.create({
        data: { namn, url, orgNummerNormalized: orgNorm },
      })
      return NextResponse.json({ ok: true, flagged: true, entry, duplicate: false }, { status: 201 })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && url) {
        const entry = await prisma.bolagsfaktaRedlistEntry.findUnique({ where: { url } })
        if (entry) {
          return NextResponse.json({ ok: true, flagged: true, entry, duplicate: true })
        }
      }
      throw e
    }
  }

  // Mode B: admin UI can POST { namn, url?, orgNummer?, nameContains? } to add a global entry.
  const namn = typeof body.namn === "string" ? body.namn.trim() : ""
  if (!namn) return NextResponse.json({ error: "Namn krävs" }, { status: 400 })

  const urlRaw = typeof body.url === "string" ? body.url.trim() : ""
  const url = urlRaw || null

  const orgInput =
    typeof body.orgNummer === "string"
      ? body.orgNummer
      : typeof body.orgNummerNormalized === "string"
        ? body.orgNummerNormalized
        : null
  const orgNorm = normalizeOrgNumber(orgInput)

  const nameContainsRaw =
    typeof body.nameContains === "string" ? body.nameContains.trim() : ""
  const nameContainsNorm = nameContainsRaw ? nameContainsRaw.toLowerCase() : null

  if (!url && !orgNorm && !nameContainsNorm) {
    return NextResponse.json(
      {
        error:
          "Ange minst ett av: org.nr, Bolagsfakta-URL eller text för automatisk namn-matchning",
      },
      { status: 400 },
    )
  }

  const orgVarsB = orgNumberLookupVariants(orgNorm)
  const orFilters: Prisma.BolagsfaktaRedlistEntryWhereInput[] = []
  if (url) orFilters.push({ url })
  if (orgVarsB.length) orFilters.push({ orgNummerNormalized: { in: orgVarsB } })
  if (nameContainsNorm) orFilters.push({ nameContains: nameContainsNorm })

  const existing =
    orFilters.length > 0
      ? await prisma.bolagsfaktaRedlistEntry.findFirst({
          where: { OR: orFilters },
        })
      : null
  if (existing) {
    return NextResponse.json({
      ok: true,
      entry: existing,
      duplicate: true,
    })
  }

  try {
    const entry = await prisma.bolagsfaktaRedlistEntry.create({
      data: {
        namn,
        url,
        orgNummerNormalized: orgNorm,
        nameContains: nameContainsNorm,
      },
    })
    return NextResponse.json(
      { ok: true, entry, duplicate: false },
      { status: 201 },
    )
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      url
    ) {
      const entry = await prisma.bolagsfaktaRedlistEntry.findUnique({
        where: { url },
      })
      if (entry) {
        return NextResponse.json({
          ok: true,
          entry,
          duplicate: true,
        })
      }
    }
    throw e
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id krävs" }, { status: 400 })
  }

  try {
    await prisma.bolagsfaktaRedlistEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Posten fanns inte" },
        { status: 404 },
      )
    }
    throw e
  }
}
