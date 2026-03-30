import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import NyTidEntry from './NyTidEntry'

export default async function TidrapporteringPage() {
  const entries = await prisma.timeEntry.findMany({
    include: { user: true },
    orderBy: { date: 'desc' },
    take: 100,
  })

  // Group by date
  const grouped: Record<string, typeof entries> = {}
  for (const entry of entries) {
    const dateKey = new Date(entry.date).toISOString().split('T')[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(entry)
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const totalHours = entries.reduce((s, e) => s + e.hours, 0)

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Arbete</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Tidrapportering</h1>
          <p className="text-sm text-gray-500 mt-0.5">{entries.length} poster • {totalHours.toFixed(1)} timmar totalt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* New entry form */}
        <div className="lg:col-span-1">
          <NyTidEntry />
        </div>

        {/* Entries grouped by date */}
        <div className="lg:col-span-2 space-y-4">
          {sortedDates.length === 0 ? (
            <div className="panel-surface p-10 text-center text-gray-400 text-sm">
              Inga tidposter ännu
            </div>
          ) : (
            sortedDates.map((dateKey) => {
              const dayEntries = grouped[dateKey]
              const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0)
              return (
                <div key={dateKey} className="panel-surface">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                      {new Date(dateKey).toLocaleDateString('sv-SE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h2>
                    <span className="text-sm text-gray-500">{dayTotal.toFixed(1)} h</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {dayEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-3 text-gray-900">{entry.description}</td>
                          <td className="px-6 py-3 text-gray-500 text-xs">
                            {entry.user.name}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {entry.billable ? (
                              <Badge variant="success">Fakturerbar</Badge>
                            ) : (
                              <Badge variant="gray">Ej fakturerbar</Badge>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-gray-900">
                            {entry.hours.toFixed(1)} h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
