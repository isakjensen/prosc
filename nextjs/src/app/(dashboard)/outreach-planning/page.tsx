import { prisma } from '@/lib/db'
import OutreachPlanningView from './OutreachPlanningView'

interface PageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    status?: string
    from?: string
    to?: string
  }>
}

export default async function OutreachPlanningPage({ searchParams }: PageProps) {
  const { q, type, status, from, to } = await searchParams

  const where: Record<string, unknown> = {}
  const conditions: Record<string, unknown>[] = []

  if (q) {
    conditions.push({
      OR: [
        { title: { contains: q } },
        { customer: { name: { contains: q } } },
      ],
    })
  }

  if (type && ['EMAIL', 'PHONE', 'SMS', 'PHYSICAL'].includes(type)) {
    conditions.push({ type })
  }

  if (status && ['PLANNED', 'COMPLETED'].includes(status)) {
    conditions.push({ status })
  }

  if (from) {
    conditions.push({ scheduledAt: { gte: new Date(from) } })
  }

  if (to) {
    conditions.push({ scheduledAt: { lte: new Date(to + 'T23:59:59') } })
  }

  if (conditions.length > 0) {
    where.AND = conditions
  }

  const [outreaches, prospects] = await Promise.all([
    prisma.outreach.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, city: true, industry: true, orgNumber: true, email: true },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
    }),
    prisma.customer.findMany({
      where: { stage: 'PROSPECT' },
      select: { id: true, name: true, city: true, industry: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const serialized = outreaches.map((o) => ({
    id: o.id,
    title: o.title,
    type: o.type,
    status: o.status,
    scheduledAt: o.scheduledAt.toISOString(),
    customerId: o.customerId,
    customerName: o.customer.name,
    customerCity: o.customer.city,
    customerIndustry: o.customer.industry,
    customerOrgNumber: o.customer.orgNumber,
    customerEmail: o.customer.email,
    userName: o.user?.name ?? null,
    emailStatus: o.emailStatus ?? null,
    subject: o.subject ?? null,
    body: o.body ?? null,
    recipients: o.recipients ?? null,
    attachments: o.attachments ?? null,
    sendAt: o.sendAt ? o.sendAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
  }))

  return (
    <OutreachPlanningView
      outreaches={serialized}
      prospects={prospects}
      filters={{ q, type, status, from, to }}
    />
  )
}
