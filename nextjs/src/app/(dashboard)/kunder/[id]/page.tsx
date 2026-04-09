import { prisma } from '@/lib/db'
import { bolagsfaktaStadPostnummerLand, formatSwedishOrgNumber } from '@/lib/bolagsfakta-overview'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import BolagsfaktaKundView from "@/components/bolagsfakta/BolagsfaktaKundView"
import BolagsfaktaRefreshButton from "@/components/bolagsfakta/BolagsfaktaRefreshButton"
import KundProjektTab from "./KundProjektTab"
import KundFlodeTab from "./KundFlodeTab"
import { EditCustomerButton, EditContactButton } from "./KundEditActions"
import KundOutreachTab from "./KundOutreachTab"
import KundTabs from "./KundTabs"
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { CustomerStage } from '@prisma/client'

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

function listBreadcrumb(stage: CustomerStage): { href: string; label: string } {
  switch (stage) {
    case 'CUSTOMER':
      return { href: '/kunder', label: 'Kunder' }
    case 'PROSPECT':
      return { href: '/prospekts', label: 'Prospekts' }
    case 'SCRAPED':
      return { href: '/pipelines', label: 'Bolagsfakta Pipeline' }
    case 'ARCHIVED':
      return { href: '/kunder', label: 'Kunder' }
    default:
      return { href: '/kunder', label: 'Kunder' }
  }
}

export default async function KundDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const rawTab = sp.tab ?? "oversikt"
  const tab = rawTab === "aktivitet" ? "flode" : rawTab

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bolagsfaktaData: true,
      bolagsfaktaForetag: {
        where: { url: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      contacts: true,
      quotes: { include: { lineItems: true }, orderBy: { createdAt: 'desc' } },
      contracts: { orderBy: { createdAt: 'desc' } },
      invoices: { include: { lineItems: true, payments: true }, orderBy: { createdAt: 'desc' } },
      tasks: { include: { assignee: true }, orderBy: { createdAt: 'desc' } },
      meetings: { orderBy: { startTime: 'desc' }, take: 10 },
      supportTickets: { orderBy: { createdAt: 'desc' }, take: 10 },
      prospectStage: { include: { currentStage: true } },
      projects: {
        include: {
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!customer) notFound()

  const allProspectStages = await prisma.prospectStage.findMany({ orderBy: { order: 'asc' } })

  const allProjects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true },
  })

  const linkedProjects = customer.projects
    .map((pc) => pc.project)
    .sort((a, b) => a.name.localeCompare(b.name, "sv"))
  const linkedProjectIds = linkedProjects.map((p) => p.id)

  const showFinanceTabs = customer.stage === 'CUSTOMER'
  const bc = listBreadcrumb(customer.stage)

  const bf = customer.bolagsfaktaData
  const canFetchBolagsfaktaWithoutStoredData =
    Boolean(customer.bolagsfaktaData?.sourceUrl?.trim()) ||
    Boolean(customer.bolagsfaktaForetag[0]?.url?.trim()) ||
    Boolean(customer.orgNumber?.trim())
  const bfLoc = bolagsfaktaStadPostnummerLand(bf)
  const overviewOrgNr =
    formatSwedishOrgNumber(bf?.orgNumberFormatted?.trim()) ||
    formatSwedishOrgNumber(customer.orgNumber) ||
    customer.orgNumber
  const overviewPhone = bf?.phone?.trim() || customer.phone
  const overviewAddress = bf?.gatuadress?.trim() || customer.address
  const overviewCity = bfLoc.city ?? customer.city
  const overviewZip = bfLoc.zip ?? customer.zip
  const overviewCountry = bfLoc.country ?? customer.country
  const discoveredWebsite = bf?.discoveredWebsite?.trim() || ""

  const stageBadge: Record<string, { label: string; variant: 'success' | 'info' | 'gray' | 'warning' }> = {
    CUSTOMER: { label: 'Kund', variant: 'success' },
    PROSPECT: { label: 'Prospekt', variant: 'info' },
    SCRAPED: { label: 'Pipeline', variant: 'gray' },
    ARCHIVED: { label: 'Arkiverad', variant: 'warning' },
  }
  const sb = stageBadge[customer.stage] ?? { label: customer.stage, variant: 'gray' as const }

  const showOutreach = customer.stage === 'PROSPECT' || customer.stage === 'CUSTOMER'

  const baseTabs = [
    { key: 'oversikt', label: 'Översikt' },
    { key: 'bolagsfakta', label: 'Bolagsfakta' },
    { key: 'projekt', label: 'Projekt' },
    { key: 'kontakter', label: 'Kontakter' },
    ...(showOutreach ? ([{ key: 'outreach', label: 'Outreach' }] as const) : []),
    { key: 'offerter', label: 'Offerter' },
    ...(showFinanceTabs ? ([{ key: 'fakturor', label: 'Fakturor' }] as const) : []),
    { key: 'insikter', label: 'Insikter' },
    { key: 'flode', label: 'Flöde' },
  ]

  const thClass = 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href={bc.href} className="hover:text-gray-600 transition-colors">{bc.label}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{customer.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            {(bf?.sniBenamningPrimary?.trim() || customer.industry) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {bf?.sniBenamningPrimary?.trim() || customer.industry}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <EditCustomerButton customer={{
              id: customer.id,
              name: customer.name,
              stage: customer.stage,
              orgNumber: customer.orgNumber,
              industry: customer.industry,
              website: customer.website,
              bolagsfaktaSourceUrl: customer.bolagsfaktaData?.sourceUrl ?? null,
              address: customer.address,
              city: customer.city,
              zip: customer.zip,
              country: customer.country,
              phone: customer.phone,
              email: customer.email,
              notes: customer.notes,
              currentStageId: customer.prospectStage?.currentStageId ?? null,
              prospectStages: allProspectStages.map((s) => ({ id: s.id, name: s.name, color: s.color })),
            }} />
            {customer.stage === 'PROSPECT' && customer.prospectStage?.currentStage && (
              <Badge variant="info">{customer.prospectStage.currentStage.name}</Badge>
            )}
            <Badge variant={sb.variant}>{sb.label}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <KundTabs tabs={baseTabs} activeTab={tab} customerId={id} />

      {/* Tab content */}
      {tab === 'oversikt' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Företagsinformation</h2>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Organisationsnummer', value: overviewOrgNr },
                ...(discoveredWebsite
                  ? ([
                      {
                        label: 'Hemsida',
                        value: discoveredWebsite,
                        href: discoveredWebsite,
                      },
                    ] as const)
                  : []),
                { label: 'Telefon', value: overviewPhone },
                { label: 'E-post', value: customer.email },
                { label: 'Adress', value: overviewAddress },
                { label: 'Stad', value: overviewCity },
                { label: 'Postnummer', value: overviewZip },
                { label: 'Land', value: overviewCountry },
                { label: 'Skapad', value: formatDate(customer.createdAt) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500 shrink-0">{row.label}</span>
                  <span className="text-gray-900 font-medium text-right min-w-0 break-all">
                    {'href' in row && row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-800 hover:underline"
                      >
                        {row.value}
                      </a>
                    ) : (
                      (row.value ?? '–') as ReactNode
                    )}
                  </span>
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
                  { label: 'Projekt', value: linkedProjects.length },
                  { label: 'Kontakter', value: customer.contacts.length },
                  { label: 'Offerter', value: customer.quotes.length },
                  ...(showFinanceTabs ? [{ label: 'Fakturor', value: customer.invoices.length }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {customer.notes && (
              <div className="panel-surface">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Anteckningar</h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'projekt' && (
        <KundProjektTab
          customerId={customer.id}
          linkedProjects={linkedProjects}
          allProjects={allProjects}
          linkedProjectIds={linkedProjectIds}
        />
      )}

      {tab === 'bolagsfakta' && (
        <div>
          {customer.bolagsfaktaData ? (
            <BolagsfaktaKundView
              customerId={customer.id}
              data={customer.bolagsfaktaData}
              contacts={customer.contacts}
            />
          ) : (
            <div className="panel-surface p-8 text-center text-sm text-gray-500">
              <p>Ingen Bolagsfakta-data är hämtad för det här bolaget ännu.</p>
              {canFetchBolagsfaktaWithoutStoredData ? (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <BolagsfaktaRefreshButton
                    customerId={customer.id}
                    label="Hämta från Bolagsfakta"
                  />
                  <p className="max-w-md text-xs text-gray-400">
                    Vi använder organisationsnummer, Bolagsfakta-URL (Redigera företag) eller pipeline-länk och hämtar företagsdata.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">
                  Lägg till organisationsnummer eller Bolagsfakta-URL under <span className="font-medium text-gray-500">Redigera</span> för att kunna hämta data.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'kontakter' && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Kontakter ({customer.contacts.length})</h2>
          </div>
          {customer.contacts.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Inga kontakter registrerade</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className={thClass}>Namn</th>
                  <th className={thClass}>Titel</th>
                  <th className={`${thClass} hidden sm:table-cell`}>E-post</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Telefon</th>
                  <th className={thClass}><span className="sr-only">Åtgärder</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customer.contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/kontakter/${c.id}`} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{c.title ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{c.email ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{c.phone ?? '–'}</td>
                    <td className="px-6 py-4 text-right">
                      <EditContactButton contact={{
                        id: c.id,
                        firstName: c.firstName,
                        lastName: c.lastName,
                        email: c.email,
                        phone: c.phone,
                        title: c.title,
                        role: c.role,
                        notes: c.notes,
                      }} />
                    </td>
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
            <h2 className="text-sm font-semibold text-gray-900">Offerter ({customer.quotes.length})</h2>
          </div>
          {customer.quotes.length === 0 ? (
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
                {customer.quotes.map((q) => (
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
            <h2 className="text-sm font-semibold text-gray-900">Fakturor ({customer.invoices.length})</h2>
          </div>
          {!showFinanceTabs ? (
            <p className="p-6 text-sm text-gray-500">
              Fakturor visas när kunden är i stadiet <strong>Kund</strong> (inte pipeline eller prospekt).
            </p>
          ) : customer.invoices.length === 0 ? (
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
                {customer.invoices.map((inv) => (
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

      {tab === "outreach" && showOutreach && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Outreach</h2>
          </div>
          <div className="p-6">
            <KundOutreachTab customerId={id} />
          </div>
        </div>
      )}

      {tab === "insikter" && (() => {
        const paidInvoices = customer.invoices.filter((i) => i.status === 'PAID')
        const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0)
        const totalPaid = customer.invoices.reduce((sum, i) => sum + i.paidAmount, 0)
        const openQuotes = customer.quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT')
        const openQuotesValue = openQuotes.reduce((sum, q) => sum + q.total, 0)
        const overdueInvoices = customer.invoices.filter((i) => i.status === 'OVERDUE')
        const overdueValue = overdueInvoices.reduce((sum, i) => sum + (i.total - i.paidAmount), 0)
        const activeTasks = customer.tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
        const upcomingMeetings = customer.meetings.filter((m) => new Date(m.startTime) > new Date())
        const openTickets = customer.supportTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')

        return (
          <div className="space-y-4">
            {/* KPI-chips */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Total intäkt', value: formatCurrency(totalRevenue), color: 'text-green-600' },
                { label: 'Öppna offerter', value: formatCurrency(openQuotesValue), sub: `${openQuotes.length} st` },
                { label: 'Förfallna fakturor', value: formatCurrency(overdueValue), color: overdueValue > 0 ? 'text-red-600' : undefined, sub: `${overdueInvoices.length} st` },
                { label: 'Totalt betalt', value: formatCurrency(totalPaid) },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="panel-surface p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${color ?? 'text-gray-900'}`}>{value}</p>
                  {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Aktiva uppgifter */}
              <div className="panel-surface">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Aktiva uppgifter ({activeTasks.length})</h3>
                </div>
                <div className="p-5 space-y-2">
                  {activeTasks.length === 0 ? (
                    <p className="text-xs text-gray-400">Inga aktiva uppgifter</p>
                  ) : activeTasks.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">{t.title}</span>
                      <Badge variant={t.priority === 'URGENT' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'gray'}>
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kommande möten */}
              <div className="panel-surface">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Kommande möten ({upcomingMeetings.length})</h3>
                </div>
                <div className="p-5 space-y-2">
                  {upcomingMeetings.length === 0 ? (
                    <p className="text-xs text-gray-400">Inga kommande möten</p>
                  ) : upcomingMeetings.slice(0, 5).map((m) => (
                    <div key={m.id} className="text-sm">
                      <p className="text-gray-700">{m.title}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(m.startTime)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Öppna supportärenden */}
              <div className="panel-surface">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Öppna ärenden ({openTickets.length})</h3>
                </div>
                <div className="p-5 space-y-2">
                  {openTickets.length === 0 ? (
                    <p className="text-xs text-gray-400">Inga öppna ärenden</p>
                  ) : openTickets.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <Link href={`/support/${t.id}`} className="text-gray-700 hover:text-blue-600 truncate">{t.title}</Link>
                      <Badge variant={t.priority === 'URGENT' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'gray'}>
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {tab === "flode" && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Flöde</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Möten, offerter, milstolpar och egna händelser — nyast först
            </p>
          </div>
          <div className="p-6">
            <KundFlodeTab customerId={id} />
          </div>
        </div>
      )}
    </div>
  )
}
