import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function SystemloggarPage({ searchParams }: PageProps) {
  const { page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const perPage = 50

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * perPage,
      take: perPage,
    }),
    prisma.systemLog.count(),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">System</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Systemloggar</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} loggposter totalt</p>
        </div>
      </div>

      <div className="panel-surface">
        {logs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Inga loggar</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Användare</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Åtgärd</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Entitet</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">IP-adress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{log.user?.name ?? '–'}</td>
                  <td className="px-6 py-3 text-gray-900 font-medium">{log.action}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {log.entityType ? (
                      <span>
                        {log.entityType}
                        {log.entityId && (
                          <span className="text-gray-400 text-xs ml-1">#{log.entityId.slice(0, 8)}</span>
                        )}
                      </span>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{log.ipAddress ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sida {pageNum} av {totalPages}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={`/system-logs?page=${pageNum - 1}`}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Föregående
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={`/system-logs?page=${pageNum + 1}`}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Nästa
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
