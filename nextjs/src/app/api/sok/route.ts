import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const contains = q

  const [customers, contacts, quotes, invoices, projects, tasks, tickets] = await Promise.all([
    prisma.customer.findMany({
      where: { OR: [{ name: { contains } }, { email: { contains } }, { orgNumber: { contains } }] },
      select: { id: true, name: true, stage: true },
      take: 5,
    }),
    prisma.contact.findMany({
      where: { OR: [{ firstName: { contains } }, { lastName: { contains } }, { email: { contains } }] },
      select: { id: true, firstName: true, lastName: true, email: true, customerId: true },
      take: 5,
    }),
    prisma.quote.findMany({
      where: { OR: [{ title: { contains } }, { number: { contains } }] },
      select: { id: true, title: true, number: true, status: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { OR: [{ title: { contains } }, { number: { contains } }] },
      select: { id: true, title: true, number: true, status: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { OR: [{ name: { contains } }, { description: { contains } }] },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains } },
      select: { id: true, title: true, status: true },
      take: 5,
    }),
    prisma.supportTicket.findMany({
      where: { OR: [{ title: { contains } }, { description: { contains } }] },
      select: { id: true, title: true, status: true },
      take: 5,
    }),
  ])

  const results = [
    ...customers.map((c) => ({ type: 'customer' as const, id: c.id, label: c.name, sub: c.stage, href: `/kunder/${c.id}` })),
    ...contacts.map((c) => ({ type: 'contact' as const, id: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.email, href: `/kontakter/${c.id}` })),
    ...quotes.map((q) => ({ type: 'quote' as const, id: q.id, label: q.title, sub: q.number, href: `/offerter/${q.id}` })),
    ...invoices.map((i) => ({ type: 'invoice' as const, id: i.id, label: i.title, sub: i.number, href: `/fakturor/${i.id}` })),
    ...projects.map((p) => ({ type: 'project' as const, id: p.id, label: p.name, sub: p.status, href: `/projekt/${p.id}` })),
    ...tasks.map((t) => ({ type: 'task' as const, id: t.id, label: t.title, sub: t.status, href: `/uppgifter` })),
    ...tickets.map((t) => ({ type: 'ticket' as const, id: t.id, label: t.title, sub: t.status, href: `/support/${t.id}` })),
  ]

  return NextResponse.json({ results })
}
