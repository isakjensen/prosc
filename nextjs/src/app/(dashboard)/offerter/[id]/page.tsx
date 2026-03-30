import { prisma } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import QuoteActions from './QuoteActions'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  ACCEPTED: 'Accepterad',
  REJECTED: 'Avvisad',
  EXPIRED: 'Utgången',
}

const statusVariant: Record<string, 'gray' | 'info' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'gray',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
}

export default async function OffertDetailPage({ params }: PageProps) {
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { company: true, lineItems: true },
  })

  if (!quote) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/offerter" className="hover:text-gray-600 transition-colors">Offerter</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{quote.number}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{quote.number}</p>
          </div>
          <Badge variant={statusVariant[quote.status] ?? 'gray'}>
            {statusLabel[quote.status] ?? quote.status}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <QuoteActions quoteId={quote.id} currentStatus={quote.status} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Offertinformation</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: 'Kund', value: quote.company.name },
              { label: 'Status', value: statusLabel[quote.status] ?? quote.status },
              { label: 'Giltig till', value: formatDate(quote.validUntil) },
              { label: 'Skapad', value: formatDate(quote.createdAt) },
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
          <h2 className="text-sm font-semibold text-gray-900">Radartiklar</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Beskrivning</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Antal</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Á-pris</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Summa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quote.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-gray-900">{item.description}</td>
                <td className="px-6 py-4 text-right text-gray-600">{item.quantity}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <div className="flex justify-end gap-8 text-sm">
            <span className="text-gray-500">Delsumma</span>
            <span className="font-medium w-32 text-right">{formatCurrency(quote.subtotal)}</span>
          </div>
          <div className="flex justify-end gap-8 text-sm">
            <span className="text-gray-500">Moms (25%)</span>
            <span className="font-medium w-32 text-right">{formatCurrency(quote.tax)}</span>
          </div>
          <div className="flex justify-end gap-8 text-sm font-semibold border-t border-gray-100 pt-2">
            <span>Totalt</span>
            <span className="w-32 text-right">{formatCurrency(quote.total)}</span>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Anteckningar</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
