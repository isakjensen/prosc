import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { lineItems: true, customer: true },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 })
  }

  if (quote.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'Bara accepterade offerter kan bli fakturor' }, { status: 400 })
  }

  // Check if an invoice already exists for this quote
  const existing = await prisma.invoice.findFirst({ where: { quoteId: id } })
  if (existing) {
    return NextResponse.json({ error: 'Faktura finns redan för denna offert', invoiceId: existing.id }, { status: 409 })
  }

  // Auto-generate invoice number
  const year = new Date().getFullYear()
  const prefix = `F-${year}-`
  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
  })

  let seq = 1
  if (lastInvoice) {
    const parts = lastInvoice.number.split('-')
    seq = parseInt(parts[2] ?? '0', 10) + 1
  }

  const number = `${prefix}${String(seq).padStart(3, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      customerId: quote.customerId,
      quoteId: quote.id,
      number,
      title: quote.title,
      status: 'DRAFT',
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      notes: quote.notes,
      lineItems: {
        create: quote.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
    include: { lineItems: true },
  })

  return NextResponse.json(invoice, { status: 201 })
}
