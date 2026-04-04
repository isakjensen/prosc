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
  const [
    customerCount,
    prospectCount,
    openInvoicesTotal,
    draftQuotesCount,
    recentActivities,
    openTickets,
    pendingTasks,
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
  ])

  return {
    customerCount,
    prospectCount,
    openInvoicesTotal: openInvoicesTotal._sum.total ?? 0,
    draftQuotesCount,
    recentActivities,
    openTickets,
    pendingTasks,
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

      {/* Recent activity */}
      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Senaste aktivitet</h2>
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
  )
}
