import { prisma } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const quoteStatusLabel: Record<string, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  ACCEPTED: 'Accepterad',
  REJECTED: 'Avvisad',
  EXPIRED: 'Utgången',
}

const quoteStatusVariant: Record<string, 'gray' | 'info' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'gray',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
}

const invoiceStatusLabel: Record<string, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  PAID: 'Betald',
  OVERDUE: 'Förfallen',
  CANCELLED: 'Avbruten',
}

const invoiceStatusVariant: Record<string, 'gray' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'gray',
  SENT: 'info',
  PAID: 'success',
  OVERDUE: 'warning',
  CANCELLED: 'danger',
}

const activityLabel: Record<string, string> = {
  CREATED: 'Skapades',
  UPDATED: 'Uppdaterades',
  STAGE_CHANGED: 'Status ändrades',
  EMAIL_SENT: 'E-post skickades',
  QUOTE_SENT: 'Offert skickades',
  INVOICE_SENT: 'Faktura skickades',
  PAYMENT_RECEIVED: 'Betalning mottagen',
  CONTRACT_SIGNED: 'Avtal signerades',
  NOTE_ADDED: 'Notering tillagd',
}

export default async function KundDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab = 'oversikt' } = await searchParams

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: true,
      quotes: { include: { lineItems: true }, orderBy: { createdAt: 'desc' } },
      contracts: { orderBy: { createdAt: 'desc' } },
      invoices: { include: { lineItems: true }, orderBy: { createdAt: 'desc' } },
      activities: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!company) notFound()

  const tabs = [
    { key: 'oversikt', label: 'Översikt' },
    { key: 'kontakter', label: 'Kontakter' },
    { key: 'offerter', label: 'Offerter' },
    { key: 'fakturor', label: 'Fakturor' },
    { key: 'aktivitet', label: 'Aktivitet' },
  ]

  const thClass = 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/kunder" className="hover:text-gray-600 transition-colors">Kunder</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{company.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            {company.industry && <p className="text-sm text-gray-500 mt-0.5">{company.industry}</p>}
          </div>
          <Badge variant="success">Kund</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/kunder/${id}?tab=${t.key}`}
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

      {/* Tab content */}
      {tab === 'oversikt' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Företagsinformation</h2>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Webbplats', value: company.website },
                { label: 'Telefon', value: company.phone },
                { label: 'E-post', value: company.email },
                { label: 'Adress', value: company.address },
                { label: 'Stad', value: company.city },
                { label: 'Postnummer', value: company.zip },
                { label: 'Land', value: company.country },
                { label: 'Skapad', value: formatDate(company.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-900 font-medium">{value ?? '–'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="panel-surface">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Sammanfattning</h2>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label: 'Kontakter', value: company.contacts.length },
                  { label: 'Offerter', value: company.quotes.length },
                  { label: 'Fakturor', value: company.invoices.length },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {company.notes && (
              <div className="panel-surface">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Anteckningar</h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{company.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'kontakter' && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Kontakter ({company.contacts.length})</h2>
          </div>
          {company.contacts.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Inga kontakter registrerade</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className={thClass}>Namn</th>
                  <th className={thClass}>Titel</th>
                  <th className={thClass}>E-post</th>
                  <th className={thClass}>Telefon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {company.contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/kontakter/${c.id}`} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{c.title ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{c.email ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{c.phone ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'offerter' && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Offerter ({company.quotes.length})</h2>
          </div>
          {company.quotes.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Inga offerter</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className={thClass}>Nummer</th>
                  <th className={thClass}>Titel</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Totalt</th>
                  <th className={thClass}>Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {company.quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/offerter/${q.id}`} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                        {q.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{q.title}</td>
                    <td className="px-6 py-4">
                      <Badge variant={quoteStatusVariant[q.status] ?? 'gray'}>
                        {quoteStatusLabel[q.status] ?? q.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{formatCurrency(q.total)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'fakturor' && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Fakturor ({company.invoices.length})</h2>
          </div>
          {company.invoices.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Inga fakturor</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className={thClass}>Nummer</th>
                  <th className={thClass}>Titel</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Totalt</th>
                  <th className={thClass}>Förfallodatum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {company.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/fakturor/${inv.id}`} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{inv.title}</td>
                    <td className="px-6 py-4">
                      <Badge variant={invoiceStatusVariant[inv.status] ?? 'gray'}>
                        {invoiceStatusLabel[inv.status] ?? inv.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{formatCurrency(inv.total)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(inv.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'aktivitet' && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Aktivitetslogg</h2>
          </div>
          <div className="p-6">
            {company.activities.length === 0 ? (
              <p className="text-sm text-gray-400">Ingen aktivitet</p>
            ) : (
              <div className="space-y-4">
                {company.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-zinc-700">
                        {a.user?.name?.charAt(0) ?? 'S'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{a.user?.name ?? 'System'}</span>{' '}
                        {activityLabel[a.type] ?? a.type}
                        {a.title && ` – ${a.title}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
