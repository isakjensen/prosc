import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDocumentHtml, generatePdf } from '@/lib/pdf-generator'
import { formatDate } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Faktura hittades inte' }, { status: 404 })
  }

  // Get company settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['companyName', 'orgNumber', 'address', 'city'] } },
  })
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  const html = generateDocumentHtml({
    type: 'invoice',
    number: invoice.number,
    title: invoice.title,
    customerName: invoice.customer.name,
    customerAddress: invoice.customer.address,
    customerCity: invoice.customer.city,
    customerOrgNumber: invoice.customer.orgNumber,
    issueDate: formatDate(invoice.issueDate),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : null,
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
    })),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    notes: invoice.notes,
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
        'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
      },
    })
  } catch {
    // Fallback: return HTML if Playwright fails
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
