import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeOrgNumber } from '@/lib/bolagsfakta-scraper'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()

  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) {
    return NextResponse.json({ error: 'Kunden hittades inte' }, { status: 404 })
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: body.name ?? customer.name,
      orgNumber: body.orgNumber !== undefined ? (normalizeOrgNumber(body.orgNumber) || null) : customer.orgNumber,
      industry: body.industry !== undefined ? (body.industry || null) : customer.industry,
      website: body.website !== undefined ? (body.website || null) : customer.website,
      address: body.address !== undefined ? (body.address || null) : customer.address,
      city: body.city !== undefined ? (body.city || null) : customer.city,
      zip: body.zip !== undefined ? (body.zip || null) : customer.zip,
      country: body.country !== undefined ? (body.country || null) : customer.country,
      phone: body.phone !== undefined ? (body.phone || null) : customer.phone,
      email: body.email !== undefined ? (body.email || null) : customer.email,
      notes: body.notes !== undefined ? (body.notes || null) : customer.notes,
    },
  })

  return NextResponse.json(updated)
}
