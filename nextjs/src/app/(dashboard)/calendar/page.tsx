import { prisma } from '@/lib/db'
import CalendarView from './CalendarView'

export default async function KalenderPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0) // Get 2 months

  const [meetings, tasks, outreaches, invoices] = await Promise.all([
    prisma.meeting.findMany({
      where: { startTime: { gte: startOfMonth, lte: endOfMonth } },
      include: { customer: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: startOfMonth, lte: endOfMonth }, status: { not: 'CANCELLED' } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.outreach.findMany({
      where: { scheduledAt: { gte: startOfMonth, lte: endOfMonth }, status: 'PLANNED' },
      include: { customer: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.invoice.findMany({
      where: { dueDate: { gte: startOfMonth, lte: endOfMonth }, status: { in: ['SENT', 'OVERDUE'] } },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  type CalendarEvent = {
    id: string
    title: string
    date: string
    type: 'meeting' | 'task' | 'outreach' | 'invoice'
    color: string
    href?: string
    sub?: string
  }

  const events: CalendarEvent[] = [
    ...meetings.map((m) => ({
      id: m.id,
      title: m.title,
      date: m.startTime.toISOString(),
      type: 'meeting' as const,
      color: 'bg-blue-500',
      href: '/meetings',
      sub: m.customer?.name ?? undefined,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      date: t.dueDate!.toISOString(),
      type: 'task' as const,
      color: 'bg-orange-500',
      href: '/tasks',
    })),
    ...outreaches.map((o) => ({
      id: o.id,
      title: o.title,
      date: o.scheduledAt.toISOString(),
      type: 'outreach' as const,
      color: "bg-brand-brown",
      sub: o.customer?.name ?? undefined,
    })),
    ...invoices.map((i) => ({
      id: i.id,
      title: `${i.number} - ${i.customer.name}`,
      date: i.dueDate!.toISOString(),
      type: 'invoice' as const,
      color: 'bg-red-500',
      href: `/invoices/${i.id}`,
      sub: 'Förfallodatum',
    })),
  ]

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5">
        <p className="page-kicker">Arbete</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Kalender</h1>
        <p className="text-sm text-gray-500 mt-0.5">{events.length} händelser denna period</p>
      </div>
      <CalendarView events={events} />
    </div>
  )
}
