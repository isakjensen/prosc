import { prisma } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'
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
  PAID: 'Betald',
  OVERDUE: 'Förfallen',
  CANCELLED: 'Avbruten',
}

const statusVariant: Record<string, 'gray' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'gray',
  SENT: 'info',
  PAID: 'success',
  OVERDUE: 'warning',
  CANCELLED: 'danger',
}

export default async function FakturaDetailPage({ params }: PageProps) {
  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true, payments: true },
  })

  if (!invoice) notFound()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/fakturor" className="hover:text-gray-600 transition-colors">Fakturor</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{invoice.number}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{invoice.number}</p>
          </div>
          <Badge variant={statusVariant[invoice.status] ?? 'gray'}>
            {statusLabel[invoice.status] ?? invoice.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Fakturainformation</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: 'Kund', value: invoice.customer.name },
              { label: 'Status', value: statusLabel[invoice.status] ?? invoice.status },
              { label: 'Utfärdad', value: formatDate(invoice.issueDate) },
              { label: 'Förfallodatum', value: formatDate(invoice.dueDate) },
              { label: 'Betalt belopp', value: formatCurrency(invoice.paidAmount) },
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
            {invoice.lineItems.map((item) => (
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
            <span className="font-medium w-32 text-right">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-end gap-8 text-sm">
            <span className="text-gray-500">Moms (25%)</span>
            <span className="font-medium w-32 text-right">{formatCurrency(invoice.tax)}</span>
          </div>
          <div className="flex justify-end gap-8 text-sm font-semibold border-t border-gray-100 pt-2">
            <span>Totalt</span>
            <span className="w-32 text-right">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.payments.length > 0 && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Betalningar</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Metod</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Belopp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-gray-900">{formatDate(p.paidAt)}</td>
                  <td className="px-6 py-4 text-gray-600">{p.method}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invoice.notes && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Anteckningar</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
