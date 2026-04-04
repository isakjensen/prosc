import { prisma } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import ProjektEditForm from './ProduktEditForm'
import FeaturesTab from './FeaturesTab'
import KunderTab from './KunderTab'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const projectStatusLabel: Record<string, string> = {
  ACTIVE: 'Aktiv',
  PAUSED: 'Pausad',
  ARCHIVED: 'Arkiverad',
}

const projectStatusVariant: Record<string, 'success' | 'warning' | 'gray'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'gray',
}

const priorityLabel: Record<string, string> = {
  LOW: 'Låg',
  MEDIUM: 'Medium',
  HIGH: 'Hög',
  URGENT: 'Brådskande',
}

const priorityVariant: Record<string, 'gray' | 'default' | 'warning' | 'danger'> = {
  LOW: 'gray',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'danger',
}

export default async function ProjektDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab = 'oversikt' } = await searchParams

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customers: {
        include: {
          customer: true,
        },
      },
      features: {
        orderBy: { order: 'asc' },
        include: {
          subtasks: { orderBy: { order: 'asc' } },
        },
      },
      boardColumns: {
        orderBy: { order: 'asc' },
        include: {
          cards: { orderBy: { order: 'asc' } },
        },
      },
      financeEntries: {
        orderBy: { startDate: 'desc' },
      },
    },
  })

  if (!project) notFound()

  const allCustomers = await prisma.customer.findMany({
    where: { stage: 'CUSTOMER' },
    orderBy: { name: 'asc' },
  })

  const tabs = [
    { key: 'oversikt', label: 'Översikt' },
    { key: 'kunder', label: 'Kunder' },
    { key: 'features', label: 'Features' },
    { key: 'board', label: 'Board' },
    { key: 'ekonomi', label: 'Ekonomi' },
  ]

  const incomeEntries = project.financeEntries.filter((e) => e.type === 'INCOME')
  const expenseEntries = project.financeEntries.filter((e) => e.type === 'EXPENSE')

  const totalIncomeExMoms = incomeEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalExpenseExMoms = expenseEntries.reduce((sum, e) => sum + e.amount, 0)

  const totalIncomeVat = incomeEntries.reduce((sum, e) => sum + e.amount * e.vatRate, 0)
  const totalExpenseVat = expenseEntries.reduce((sum, e) => sum + e.amount * e.vatRate, 0)

  const linkedCustomerIds = new Set(project.customers.map((c) => c.customerId))

  const thClass = 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/projekt" className="hover:text-gray-600 transition-colors">Projekt</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{project.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <Badge variant={projectStatusVariant[project.status] ?? 'gray'}>
            {projectStatusLabel[project.status] ?? project.status}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/projekt/${id}?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Översikt */}
      {tab === 'oversikt' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Projektinformation</h2>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Status', value: projectStatusLabel[project.status] ?? project.status },
                { label: 'Kunder', value: project.customers.length },
                { label: 'Features', value: project.features.length },
                { label: 'Skapad', value: formatDate(project.createdAt) },
                { label: 'Uppdaterad', value: formatDate(project.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <ProjektEditForm project={{ id: project.id, name: project.name, description: project.description ?? '', status: project.status }} />
        </div>
      )}

      {/* Kunder */}
      {tab === 'kunder' && (
        <KunderTab
          projektId={id}
          linkedCustomers={project.customers.map((c) => ({ id: c.customerId, name: c.customer.name, city: c.customer.city }))}
          allCustomers={allCustomers.map((c) => ({ id: c.id, name: c.name, city: c.city }))}
          linkedCustomerIds={Array.from(linkedCustomerIds)}
        />
      )}

      {/* Features */}
      {tab === 'features' && (
        <FeaturesTab
          projektId={id}
          features={project.features.map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description ?? '',
            status: f.status,
            priority: f.priority,
            subtasks: f.subtasks.map((s) => ({
              id: s.id,
              title: s.title,
              completed: s.completed,
            })),
          }))}
        />
      )}

      {/* Board */}
      {tab === 'board' && (
        <div>
          {project.boardColumns.length === 0 ? (
            <div className="panel-surface p-10 text-center text-gray-400 text-sm">
              Inga kolumner i boardet ännu
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {project.boardColumns.map((column) => (
                <div key={column.id} className="min-w-64 w-64 flex-shrink-0">
                  <div
                    className="rounded-md p-3 mb-3"
                    style={{ backgroundColor: column.color ? `${column.color}20` : '#f3f4f6' }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">{column.name}</h3>
                      <span className="text-xs text-gray-500">{column.cards.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {column.cards.map((card) => (
                      <div key={card.id} className="panel-surface p-3">
                        <p className="text-sm font-medium text-gray-900">{card.title}</p>
                        {card.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={priorityVariant[card.priority] ?? 'gray'}>
                            {priorityLabel[card.priority] ?? card.priority}
                          </Badge>
                          {card.dueDate && (
                            <span className="text-xs text-gray-400">{formatDate(card.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {column.cards.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Inga kort</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ekonomi */}
      {tab === 'ekonomi' && (
        <div className="space-y-6">
          {/* Intäkter */}
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Intäkter</h2>
              <Badge variant="success">{incomeEntries.length} poster</Badge>
            </div>
            {incomeEntries.length === 0 ? (
              <p className="px-6 py-6 text-sm text-gray-400">Inga intäkter registrerade</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className={thClass}>Beskrivning</th>
                    <th className={thClass}>Kategori</th>
                    <th className={thClass}>Datum</th>
                    <th className={thClass}>Återkommande</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Belopp ex moms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incomeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900">{entry.description}</td>
                      <td className="px-6 py-4 text-gray-600">{entry.category ?? '–'}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(entry.startDate)}</td>
                      <td className="px-6 py-4">
                        {entry.isRecurring ? (
                          <Badge variant="info">Ja</Badge>
                        ) : (
                          <span className="text-gray-400">Nej</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-green-700 font-medium">
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="border-t border-gray-100 px-6 py-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Summa ex moms</span>
                <span className="font-medium text-gray-900">{formatCurrency(totalIncomeExMoms)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Moms (25%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(totalIncomeVat)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900">Summa inkl moms</span>
                <span className="text-green-700">{formatCurrency(totalIncomeExMoms + totalIncomeVat)}</span>
              </div>
            </div>
          </div>

          {/* Kostnader */}
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Kostnader</h2>
              <Badge variant="danger">{expenseEntries.length} poster</Badge>
            </div>
            {expenseEntries.length === 0 ? (
              <p className="px-6 py-6 text-sm text-gray-400">Inga kostnader registrerade</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className={thClass}>Beskrivning</th>
                    <th className={thClass}>Kategori</th>
                    <th className={thClass}>Datum</th>
                    <th className={thClass}>Återkommande</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Belopp ex moms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenseEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900">{entry.description}</td>
                      <td className="px-6 py-4 text-gray-600">{entry.category ?? '–'}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(entry.startDate)}</td>
                      <td className="px-6 py-4">
                        {entry.isRecurring ? (
                          <Badge variant="info">Ja</Badge>
                        ) : (
                          <span className="text-gray-400">Nej</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-red-700 font-medium">
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="border-t border-gray-100 px-6 py-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Summa ex moms</span>
                <span className="font-medium text-gray-900">{formatCurrency(totalExpenseExMoms)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Moms (25%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(totalExpenseVat)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900">Summa inkl moms</span>
                <span className="text-red-700">{formatCurrency(totalExpenseExMoms + totalExpenseVat)}</span>
              </div>
            </div>
          </div>

          {/* Netto */}
          <div className="panel-surface p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Nettoresultat</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Totala intäkter ex moms</span>
                <span className="text-green-700 font-medium">{formatCurrency(totalIncomeExMoms)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Totala kostnader ex moms</span>
                <span className="text-red-700 font-medium">−{formatCurrency(totalExpenseExMoms)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Netto ex moms</span>
                <span className={totalIncomeExMoms - totalExpenseExMoms >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {formatCurrency(totalIncomeExMoms - totalExpenseExMoms)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
