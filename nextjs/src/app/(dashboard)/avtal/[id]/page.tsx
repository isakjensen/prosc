import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  SIGNED: 'Signerat',
  EXPIRED: 'Utgånget',
  CANCELLED: 'Avbrutet',
}

const statusVariant: Record<string, 'gray' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'gray',
  SENT: 'info',
  SIGNED: 'success',
  EXPIRED: 'warning',
  CANCELLED: 'danger',
}

export default async function AvtalDetailPage({ params }: PageProps) {
  const { id } = await params

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { customer: true, template: true, quote: true },
  })

  if (!contract) notFound()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/avtal" className="hover:text-gray-600 transition-colors">Avtal</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{contract.number}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{contract.number}</p>
          </div>
          <Badge variant={statusVariant[contract.status] ?? 'gray'}>
            {statusLabel[contract.status] ?? contract.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Avtalsinformation</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: 'Kund', value: contract.customer.name },
              { label: 'Status', value: statusLabel[contract.status] ?? contract.status },
              { label: 'Mall', value: contract.template?.name ?? '–' },
              { label: 'Kopplad offert', value: contract.quote?.number ?? '–' },
              { label: 'Signerat', value: formatDate(contract.signedAt) },
              { label: 'Utgår', value: formatDate(contract.expiresAt) },
              { label: 'Skapad', value: formatDate(contract.createdAt) },
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
          <h2 className="text-sm font-semibold text-gray-900">Avtalsinnehåll</h2>
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
            {contract.content || 'Inget innehåll'}
          </div>
        </div>
      </div>
    </div>
  )
}
