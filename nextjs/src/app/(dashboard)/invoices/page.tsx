import { prisma } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ status?: string }>
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

export default async function FakturorPage({ searchParams }: PageProps) {
  const { status } = await searchParams

  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as never } : {},
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })

  const statusOptions = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Affär</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Fakturor</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} fakturor</p>
        </div>
        <Link href="/invoices/new">
          <Button>+ Ny faktura</Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/invoices"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !status ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alla
        </Link>
        {statusOptions.map((s) => (
          <Link
            key={s}
            href={`/invoices?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s
                ? 'bg-zinc-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {statusLabel[s]}
          </Link>
        ))}
      </div>

      <div className="panel-surface">
          {invoices.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Inga fakturor hittades</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nummer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Titel</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kund</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Totalt</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Förfallodatum</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Utfärdad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                      >
                        {invoice.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{invoice.title}</td>
                    <td className="px-6 py-4 text-gray-600">{invoice.customer.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[invoice.status] ?? 'gray'}>
                        {statusLabel[invoice.status] ?? invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{formatCurrency(invoice.total)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(invoice.dueDate)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(invoice.issueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
