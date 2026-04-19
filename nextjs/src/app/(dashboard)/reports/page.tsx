import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Calendar, AlertCircle, FileText, Building2, Filter } from 'lucide-react'

export default async function RapporterPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [
    monthlyRevenue,
    yearlyRevenue,
    totalInvoiced,
    totalPaid,
    overdueTotal,
    customerCount,
    prospectCount,
    openQuotesTotal,
    taskStats,
    ticketStats,
  ] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: 'PAID', issueDate: { gte: startOfMonth } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: 'PAID', issueDate: { gte: startOfYear } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { status: 'OVERDUE' }, _sum: { total: true } }),
    prisma.customer.count({ where: { stage: 'CUSTOMER' } }),
    prisma.customer.count({ where: { stage: 'PROSPECT' } }),
    prisma.quote.aggregate({ where: { status: { in: ['DRAFT', 'SENT'] } }, _sum: { total: true } }),
    prisma.task.groupBy({ by: ['status'], _count: true }),
    prisma.supportTicket.groupBy({ by: ['status'], _count: true }),
  ])

  const monthRevenue = monthlyRevenue._sum.total ?? 0
  const yearRevenue = yearlyRevenue._sum.total ?? 0
  const allInvoiced = totalInvoiced._sum.total ?? 0
  const allPaid = totalPaid._sum.total ?? 0
  const overdue = overdueTotal._sum.total ?? 0
  const openQuotes = openQuotesTotal._sum.total ?? 0
  const collectionRate = allInvoiced > 0 ? (allPaid / allInvoiced) * 100 : 0

  const taskStatusLabel: Record<string, string> = { TODO: 'Att göra', IN_PROGRESS: 'Pågående', REVIEW: 'Granskning', DONE: 'Klart', CANCELLED: 'Avbrutet' }
  const ticketStatusLabel: Record<string, string> = { OPEN: 'Öppna', IN_PROGRESS: 'Pågående', RESOLVED: 'Lösta', CLOSED: 'Stängda' }

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">System</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Rapporter</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nyckeltal och affärsöversikt</p>
        </div>
      </div>

      {/* Top hero chips */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Intäkt denna månad', value: formatCurrency(monthRevenue), icon: TrendingUp, iconClass: 'hero-chip__icon--emerald' },
          { label: 'Intäkt detta år', value: formatCurrency(yearRevenue), icon: Calendar, iconClass: 'hero-chip__icon' },
          { label: 'Förfallna fakturor', value: formatCurrency(overdue), icon: AlertCircle, iconClass: 'hero-chip__icon--red' },
          { label: 'Öppna offerter', value: formatCurrency(openQuotes), icon: FileText, iconClass: 'hero-chip__icon--amber' },
        ].map((stat) => (
          <div key={stat.label} className="hero-chip">
            <div className={`hero-chip__icon ${stat.iconClass}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="hero-chip__value text-base">{stat.value}</div>
              <div className="hero-chip__label truncate">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Invoice summary */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Fakturasummering</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {[
                { label: 'Totalt fakturerat', value: formatCurrency(allInvoiced) },
                { label: 'Totalt betalt', value: formatCurrency(allPaid), green: true },
                { label: 'Utestående', value: formatCurrency(allInvoiced - allPaid) },
              ].map(({ label, value, green }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${green ? 'text-green-600' : 'text-gray-900'}`}>{value}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Inbetalningsgrad</span>
                <span className="font-medium text-gray-700">{collectionRate.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(collectionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CRM summary */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">CRM-summering</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Kunder', value: customerCount, iconClass: 'hero-chip__icon' },
                { label: 'Prospekts', value: prospectCount, iconClass: 'hero-chip__icon--violet' },
              ].map(({ label, value, iconClass }) => (
                <div key={label} className="rounded-lg border border-gray-100 p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task stats */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Uppgifter per status</h2>
          </div>
          <div className="p-6 space-y-4">
            {taskStats.length === 0 ? (
              <p className="text-sm text-gray-400">Inga uppgifter</p>
            ) : (
              taskStats.map((s) => {
                const totalTasks = taskStats.reduce((sum, x) => sum + x._count, 0)
                const pct = totalTasks > 0 ? (s._count / totalTasks) * 100 : 0
                return (
                  <div key={s.status}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600 font-medium">{taskStatusLabel[s.status] ?? s.status}</span>
                      <span className="text-gray-400">{s._count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-700 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Ticket stats */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Ärenden per status</h2>
          </div>
          <div className="p-6 space-y-4">
            {ticketStats.length === 0 ? (
              <p className="text-sm text-gray-400">Inga ärenden</p>
            ) : (
              ticketStats.map((s) => {
                const totalTickets = ticketStats.reduce((sum, x) => sum + x._count, 0)
                const pct = totalTickets > 0 ? (s._count / totalTickets) * 100 : 0
                const colors: Record<string, string> = {
                  OPEN: "bg-brand-brown",
                  IN_PROGRESS: "bg-brand-green",
                  RESOLVED: "bg-brand-green/70",
                  CLOSED: "bg-brand-gray",
                }
                return (
                  <div key={s.status}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600 font-medium">{ticketStatusLabel[s.status] ?? s.status}</span>
                      <span className="text-gray-400">{s._count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[s.status] ?? 'bg-gray-400'} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
