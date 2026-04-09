import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import {
  Building2,
  Banknote,
  FileText,
  Clock,
  Filter,
  LifeBuoy,
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    customerCount,
    prospectCount,
    openInvoicesTotal,
    draftQuotesCount,
    recentActivities,
    openTickets,
    pendingTasks,
    revenueThisMonth,
    upcomingMeetings,
    overdueInvoices,
    tasksByUser,
  ] = await Promise.all([
    prisma.customer.count({ where: { stage: 'CUSTOMER' } }),
    prisma.customer.count({ where: { stage: 'PROSPECT' } }),
    prisma.invoice.aggregate({
      where: { status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { total: true },
    }),
    prisma.quote.count({ where: { status: 'DRAFT' } }),
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: true, customer: true },
    }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.meeting.findMany({
      where: { startTime: { gte: now } },
      orderBy: { startTime: 'asc' },
      take: 5,
      include: { customer: true },
    }),
    prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    prisma.task.groupBy({
      by: ['assignedTo'],
      where: { status: { in: ['TODO', 'IN_PROGRESS'] }, assignedTo: { not: null } },
      _count: true,
    }),
  ])

  // Get user names for task assignments
  const userIds = tasksByUser.map((t) => t.assignedTo).filter(Boolean) as string[]
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const teamWorkload = tasksByUser
    .filter((t) => t.assignedTo)
    .map((t) => ({ name: userMap[t.assignedTo!] ?? 'Okänd', count: t._count }))
    .sort((a, b) => b.count - a.count)

  return {
    customerCount,
    prospectCount,
    openInvoicesTotal: openInvoicesTotal._sum.total ?? 0,
    draftQuotesCount,
    recentActivities,
    openTickets,
    pendingTasks,
    revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
    upcomingMeetings,
    overdueInvoices,
    teamWorkload,
  }
}

const activityLabels: Record<string, string> = {
  CREATED: 'Skapade',
  UPDATED: 'Uppdaterade',
  STAGE_CHANGED: 'Ändrade status på',
  EMAIL_SENT: 'Skickade e-post till',
  QUOTE_SENT: 'Skickade offert till',
  INVOICE_SENT: 'Skickade faktura till',
  PAYMENT_RECEIVED: 'Mottog betalning från',
  CONTRACT_SIGNED: 'Signerade avtal med',
  TASK_COMPLETED: 'Slutförde uppgift',
  NOTE_ADDED: 'Lade till notering',
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      label: 'Kunder',
      value: stats.customerCount,
      icon: Building2,
      iconClass: 'hero-chip__icon',
      href: '/kunder',
    },
    {
      label: 'Prospekts',
      value: stats.prospectCount,
      icon: Filter,
      iconClass: 'hero-chip__icon--violet',
      href: '/prospekts',
    },
    {
      label: 'Utestående fakturor',
      value: formatCurrency(stats.openInvoicesTotal),
      icon: Banknote,
      iconClass: 'hero-chip__icon--emerald',
      href: '/fakturor',
    },
    {
      label: 'Offerter (utkast)',
      value: stats.draftQuotesCount,
      icon: FileText,
      iconClass: 'hero-chip__icon--amber',
      href: '/offerter',
    },
    {
      label: 'Öppna ärenden',
      value: stats.openTickets,
      icon: LifeBuoy,
      iconClass: 'hero-chip__icon--red',
      href: '/support',
    },
    {
      label: 'Pågående uppgifter',
      value: stats.pendingTasks,
      icon: Clock,
      iconClass: 'hero-chip__icon--blue',
      href: '/uppgifter',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-hero pb-5">
        <p className="page-kicker">Affärssystem</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">Översikt</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="hero-chip lift-card group">
            <div className={`hero-chip__icon ${card.iconClass}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="hero-chip__value">{card.value}</div>
              <div className="hero-chip__label truncate">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue + Recent activity row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue this month */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Intäkt denna månad</h2>
          </div>
          <div className="p-6">
            <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.revenueThisMonth)}</p>
            <p className="text-xs text-gray-400 mt-1">Mottagna betalningar</p>
          </div>
        </div>

        {/* Recent activity */}
        <div className="panel-surface lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Senaste aktivitet</h2>
          </div>
          <div className="p-6">
            {stats.recentActivities.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-zinc-500">Ingen aktivitet ännu</p>
            ) : (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-white">
                        {activity.user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 dark:text-zinc-300">
                        <span className="font-medium">{activity.user?.name ?? 'System'}</span>{' '}
                        {activityLabels[activity.type] ?? activity.type}{' '}
                        {activity.customer && (
                          <span className="font-medium">{activity.customer.name}</span>
                        )}
                        {!activity.customer && (
                          <span className="font-medium">{activity.title}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {new Date(activity.createdAt).toLocaleDateString('sv-SE', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: upcoming meetings, overdue invoices, team workload */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming meetings */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Kommande möten</h2>
          </div>
          <div className="p-5 space-y-3">
            {stats.upcomingMeetings.length === 0 ? (
              <p className="text-xs text-gray-400">Inga kommande möten</p>
            ) : (
              stats.upcomingMeetings.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="text-center min-w-[40px]">
                    <p className="text-[10px] text-gray-500">
                      {new Date(m.startTime).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs font-semibold text-gray-900">
                      {new Date(m.startTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{m.title}</p>
                    {m.customer && <p className="text-[10px] text-gray-400">{m.customer.name}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue invoices */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Förfallna fakturor</h2>
          </div>
          <div className="p-5 space-y-3">
            {stats.overdueInvoices.length === 0 ? (
              <p className="text-xs text-gray-400">Inga förfallna fakturor</p>
            ) : (
              stats.overdueInvoices.map((inv) => (
                <Link key={inv.id} href={`/fakturor/${inv.id}`} className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{inv.number}</p>
                    <p className="text-[10px] text-gray-400">{inv.customer.name}</p>
                  </div>
                  <span className="text-sm font-medium text-red-600 shrink-0">{formatCurrency(inv.total - inv.paidAmount)}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Team workload */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Teambelastning</h2>
          </div>
          <div className="p-5 space-y-3">
            {stats.teamWorkload.length === 0 ? (
              <p className="text-xs text-gray-400">Inga tilldelade uppgifter</p>
            ) : (
              stats.teamWorkload.map((member) => (
                <div key={member.name} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-zinc-300 truncate">{member.name}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{member.count} uppgifter</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
