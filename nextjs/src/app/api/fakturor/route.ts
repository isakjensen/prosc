import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { company: true, lineItems: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(invoices)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Auto-generate number: F-YYYY-XXX
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

  const lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> =
    body.lineItems ?? []

  const subtotal = lineItems.reduce((sum: number, item: { total: number }) => sum + item.total, 0)
  const taxRate = 0.25
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const invoice = await prisma.invoice.create({
    data: {
      companyId: body.companyId,
      number,
      title: body.title,
      status: 'DRAFT',
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      subtotal,
      tax,
      total,
      notes: body.notes || null,
      lineItems: {
        create: lineItems.map((item) => ({
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
