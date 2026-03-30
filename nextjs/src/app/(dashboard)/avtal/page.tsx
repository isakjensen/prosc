import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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

export default async function AvtalPage() {
  const contracts = await prisma.contract.findMany({
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Affär</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Avtal</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contracts.length} avtal totalt</p>
        </div>
      </div>

      <div className="panel-surface">
        {contracts.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Inga avtal</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nummer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Titel</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kund</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Signerat</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Utgår</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Skapad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/avtal/${contract.id}`}
                      className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                    >
                      {contract.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{contract.title}</td>
                  <td className="px-6 py-4 text-gray-600">{contract.company.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[contract.status] ?? 'gray'}>
                      {statusLabel[contract.status] ?? contract.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(contract.signedAt)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(contract.expiresAt)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(contract.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
