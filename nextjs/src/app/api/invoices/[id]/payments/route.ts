import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { onPaymentReceived } from '@/lib/workflows'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) {
    return NextResponse.json({ error: 'Faktura hittades inte' }, { status: 404 })
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: id,
      amount: body.amount,
      method: body.method || 'BANK_TRANSFER',
      reference: body.reference || null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      notes: body.notes || null,
    },
  })

  // Update invoice paidAmount and status
  const allPayments = await prisma.payment.findMany({ where: { invoiceId: id } })
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0)

  const updateData: Record<string, unknown> = { paidAmount: totalPaid }
  if (totalPaid >= invoice.total) {
    updateData.status = 'PAID'
  }

  await prisma.invoice.update({ where: { id }, data: updateData })

  // Trigger workflow: notify on full payment
  if (totalPaid >= invoice.total) {
    onPaymentReceived(id).catch(() => {})
  }

  return NextResponse.json(payment, { status: 201 })
}
