import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDocumentHtml, generatePdf } from '@/lib/pdf-generator'
import { formatDate } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 })
  }

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['companyName', 'orgNumber', 'address', 'city'] } },
  })
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  const html = generateDocumentHtml({
    type: 'quote',
    number: quote.number,
    title: quote.title,
    customerName: quote.customer.name,
    customerAddress: quote.customer.address,
    customerCity: quote.customer.city,
    customerOrgNumber: quote.customer.orgNumber,
    issueDate: formatDate(quote.createdAt),
    validUntil: quote.validUntil ? formatDate(quote.validUntil) : null,
    lineItems: quote.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
    })),
    subtotal: quote.subtotal,
    tax: quote.tax,
    total: quote.total,
    notes: quote.notes,
    companyName: settingsMap.companyName,
    companyOrgNumber: settingsMap.orgNumber,
    companyAddress: settingsMap.address,
    companyCity: settingsMap.city,
  })

  try {
    const pdf = await generatePdf(html)
    return new NextResponse(pdf.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.number}.pdf"`,
      },
    })
  } catch {
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
