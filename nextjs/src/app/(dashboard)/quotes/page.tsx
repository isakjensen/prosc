import { prisma } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusFilterTabs } from '@/components/ui/status-filter-tabs'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ status?: string }>
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

export default async function OfferterPage({ searchParams }: PageProps) {
  const { status } = await searchParams

  const quotes = await prisma.quote.findMany({
    where: status ? { status: status as never } : {},
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Affär</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Offerter</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotes.length} offerter</p>
        </div>
        <Link href="/quotes/new">
          <Button>+ Ny offert</Button>
        </Link>
      </div>

      {/* Filter */}
      <StatusFilterTabs
        basePath="/quotes"
        activeValue={status}
        options={[
          { value: '', label: 'Alla' },
          { value: 'DRAFT', label: 'Utkast' },
          { value: 'SENT', label: 'Skickad' },
          { value: 'ACCEPTED', label: 'Accepterad' },
          { value: 'REJECTED', label: 'Avvisad' },
          { value: 'EXPIRED', label: 'Utgången' },
        ]}
      />

      <div className="panel-surface overflow-x-auto">
          {quotes.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Inga offerter hittades</div>
          ) : (
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nummer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Titel</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kund</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Totalt</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Giltig till</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                      >
                        {quote.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{quote.title}</td>
                    <td className="px-6 py-4 text-gray-600">{quote.customer.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[quote.status] ?? 'gray'}>
                        {statusLabel[quote.status] ?? quote.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{formatCurrency(quote.total)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(quote.validUntil)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(quote.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
