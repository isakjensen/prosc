import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const columns = [
  { key: 'TODO', label: 'Att göra', color: 'bg-gray-100 text-gray-700' },
  { key: 'IN_PROGRESS', label: 'Pågående', color: 'bg-[#dbeafe] text-[#1d4ed8]' },
  { key: 'REVIEW', label: 'Granskning', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'DONE', label: 'Klart', color: 'bg-green-100 text-green-700' },
]

const priorityVariant: Record<string, 'gray' | 'info' | 'warning' | 'danger'> = {
  LOW: 'gray',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
}

const priorityLabel: Record<string, string> = {
  LOW: 'Låg',
  MEDIUM: 'Medium',
  HIGH: 'Hög',
  URGENT: 'Brådskande',
}

export default async function UppgifterPage() {
  const tasks = await prisma.task.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: { assignee: true, customer: true, project: true },
    orderBy: { createdAt: 'desc' },
  })

  const byStatus: Record<string, typeof tasks> = {}
  for (const col of columns) {
    byStatus[col.key] = tasks.filter((t) => t.status === col.key)
  }

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Arbete</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Uppgifter</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} uppgifter totalt</p>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.key} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${col.color}`}>
                {col.label}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{byStatus[col.key]?.length ?? 0}</span>
            </div>

            <div className="space-y-3">
              {(byStatus[col.key]?.length ?? 0) === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  Inga uppgifter
                </div>
              ) : (
                byStatus[col.key].map((task) => (
                  <div key={task.id} className="panel-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 text-sm leading-snug">{task.title}</h3>
                      <Badge variant={priorityVariant[task.priority] ?? 'gray'}>
                        {priorityLabel[task.priority] ?? task.priority}
                      </Badge>
                    </div>
                    {(task.customer || task.project) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {task.customer && (
                          <Link
                            href={`/customers/${task.customer.id}`}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors dark:bg-blue-950/30 dark:text-blue-400"
                          >
                            {task.customer.name}
                          </Link>
                        )}
                        {task.project && (
                          <Link
                            href={`/projects/${task.project.id}`}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 transition-colors dark:bg-cyan-950/30 dark:text-cyan-400"
                          >
                            {task.project.name}
                          </Link>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {task.dueDate ? (
                        <span className="text-xs text-gray-500">
                          Förfaller {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span />
                      )}
                      {task.assignee && (
                        <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-zinc-700">
                            {task.assignee.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
