import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function KunderPage({ searchParams }: PageProps) {
  const { q } = await searchParams

  const customers = await prisma.customer.findMany({
    where: {
      stage: 'CUSTOMER',
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-center justify-between gap-4">
        <div>
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Kunder</h1>
        </div>
        <Link href="/customers/ny">
          <Button>+ Ny kund</Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Sök efter kund…"
          className="flex h-10 w-full max-w-sm rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 hover:bg-gray-50 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:bg-white transition-all"
        />
      </form>

      {/* Table */}
      <div className="panel-surface">
          {customers.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              Inga kunder hittades
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Namn</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Stad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Telefon</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">E-post</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Skapad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                      >
                        {customer.name}
                      </Link>
                      {customer.industry && (
                        <p className="text-xs text-gray-400 mt-0.5">{customer.industry}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{customer.city ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{customer.phone ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{customer.email ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(customer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
