import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
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

export default async function SupportTicketDetailPage({ params }: PageProps) {
  const { id } = await params

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      customer: true,
      creator: true,
      assignee: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Link href="/support" className="hover:text-gray-600 transition-colors">Support</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-600">Ärende</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
        </div>
        <div className="flex gap-2">
          <Badge variant={priorityVariant[ticket.priority] ?? 'gray'}>
            {priorityLabel[ticket.priority] ?? ticket.priority}
          </Badge>
          <Badge variant={statusVariant[ticket.status] ?? 'gray'}>
            {statusLabel[ticket.status] ?? ticket.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Ärendeinformation</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: 'Kund', value: ticket.customer.name },
              { label: 'Skapad av', value: ticket.creator.name },
              { label: 'Ansvarig', value: ticket.assignee?.name ?? '–' },
              { label: 'Status', value: statusLabel[ticket.status] ?? ticket.status },
              { label: 'Prioritet', value: priorityLabel[ticket.priority] ?? ticket.priority },
              { label: 'Skapad', value: formatDate(ticket.createdAt) },
              { label: 'Löst', value: formatDate(ticket.resolvedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Beskrivning</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>
      </div>

      {ticket.comments.length > 0 && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Kommentarer ({ticket.comments.length})</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {ticket.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-zinc-700">
                      {comment.user.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
                      <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
