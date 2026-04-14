import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { StatusFilterTabs } from '@/components/ui/status-filter-tabs'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

const statusLabel: Record<string, string> = {
  OPEN: 'Öppen',
  IN_PROGRESS: 'Pågående',
  RESOLVED: 'Löst',
  CLOSED: 'Stängd',
}

const statusVariant: Record<string, 'danger' | 'info' | 'success' | 'gray'> = {
  OPEN: 'danger',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'gray',
}

const priorityLabel: Record<string, string> = {
  LOW: 'Låg',
  MEDIUM: 'Medium',
  HIGH: 'Hög',
  URGENT: 'Brådskande',
}

const priorityVariant: Record<string, 'gray' | 'info' | 'warning' | 'danger'> = {
  LOW: 'gray',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
}

export default async function SupportPage({ searchParams }: PageProps) {
  const { status } = await searchParams

  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: status as never } : {},
    include: { customer: true, creator: true, assignee: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Arbete</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Support</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tickets.length} ärenden</p>
        </div>
      </div>

      {/* Filter */}
      <StatusFilterTabs
        basePath="/support"
        activeValue={status}
        options={[
          { value: '', label: 'Alla' },
          { value: 'OPEN', label: 'Öppen' },
          { value: 'IN_PROGRESS', label: 'Pågående' },
          { value: 'RESOLVED', label: 'Löst' },
          { value: 'CLOSED', label: 'Stängd' },
        ]}
      />

      <div className="panel-surface overflow-x-auto">
          {tickets.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Inga ärenden hittades</div>
          ) : (
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Titel</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kund</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Prioritet</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Ansvarig</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Skapad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/support/${ticket.id}`}
                        className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{ticket.customer.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[ticket.status] ?? 'gray'}>
                        {statusLabel[ticket.status] ?? ticket.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={priorityVariant[ticket.priority] ?? 'gray'}>
                        {priorityLabel[ticket.priority] ?? ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{ticket.assignee?.name ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
