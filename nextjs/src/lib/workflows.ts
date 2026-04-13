import { prisma } from '@/lib/db'

/**
 * Automated workflow engine.
 * Call these functions after relevant data changes to trigger side effects.
 */

/** When a quote is accepted, create a draft invoice and notify */
export async function onQuoteAccepted(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true, customer: true },
  })
  if (!quote) return

  // Check if invoice already exists
  const existing = await prisma.invoice.findFirst({ where: { quoteId } })
  if (existing) return

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
  })

  // Create notification for all admins/managers
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true },
  })

  await prisma.notification.createMany({
    data: admins.map((u) => ({
      userId: u.id,
      type: 'INVOICE_SENT' as const,
      title: 'Fakturautkast skapat automatiskt',
      message: `Offert ${quote.number} accepterades. Faktura ${number} skapades som utkast för ${quote.customer.name}.`,
      link: `/invoices/${invoice.id}`,
    })),
  })

  return invoice
}

/** When an invoice becomes overdue, send notification */
export async function onInvoiceOverdue(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  })
  if (!invoice) return

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true },
  })

  await prisma.notification.createMany({
    data: admins.map((u) => ({
      userId: u.id,
      type: 'WARNING' as const,
      title: 'Faktura förfallen',
      message: `Faktura ${invoice.number} för ${invoice.customer.name} har förfallit. Utestående: ${(invoice.total - invoice.paidAmount).toFixed(0)} kr.`,
      link: `/invoices/${invoiceId}`,
    })),
  })
}

/** When a support ticket is created, notify the assigned user */
export async function onTicketCreated(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { customer: true },
  })
  if (!ticket || !ticket.assignedToId) return

  await prisma.notification.create({
    data: {
      userId: ticket.assignedToId,
      type: 'TICKET_CREATED',
      title: 'Nytt supportärende tilldelat',
      message: `"${ticket.title}" från ${ticket.customer.name} har tilldelats dig.`,
      link: `/support/${ticketId}`,
    },
  })
}

/** When a prospect stage changes, create a follow-up task */
export async function onProspectStageChanged(customerId: string, stageName: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) return

  await prisma.task.create({
    data: {
      title: `Uppföljning: ${customer.name} → ${stageName}`,
      description: `Prospekt ${customer.name} har flyttats till steg "${stageName}". Planera nästa åtgärd.`,
      status: 'TODO',
      priority: 'MEDIUM',
      customerId,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    },
  })
}

/** When a payment is received that completes an invoice */
export async function onPaymentReceived(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  })
  if (!invoice) return

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true },
  })

  await prisma.notification.createMany({
    data: admins.map((u) => ({
      userId: u.id,
      type: 'PAYMENT_RECEIVED' as const,
      title: 'Betalning mottagen',
      message: `Faktura ${invoice.number} för ${invoice.customer.name} är nu betald (${invoice.total.toFixed(0)} kr).`,
      link: `/invoices/${invoiceId}`,
    })),
  })
}
