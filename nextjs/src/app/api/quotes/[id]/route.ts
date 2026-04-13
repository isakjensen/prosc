import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { onQuoteAccepted } from '@/lib/workflows'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 })
  }

  return NextResponse.json(quote)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      status: body.status,
    },
    include: { customer: true, lineItems: true },
  })

  // Trigger workflow: auto-create invoice draft when quote accepted
  if (body.status === 'ACCEPTED') {
    onQuoteAccepted(id).catch(() => {})
  }

  return NextResponse.json(quote)
}
