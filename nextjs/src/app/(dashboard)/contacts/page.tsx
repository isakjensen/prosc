import { Fragment } from 'react'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ContactsDeduplicateButton } from './ContactsDeduplicateButton'
import { ContactsFilterSheet } from './ContactsFilterSheet'

interface PageProps {
  searchParams: Promise<{
    name?: string
    email?: string
    phone?: string
    customerId?: string
    hasEmail?: string
    hasPhone?: string
  }>
}

export default async function KontakterPage({ searchParams }: PageProps) {
  const { name, email, phone, customerId, hasEmail, hasPhone } = await searchParams

  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: {
        AND: [
          name ? { OR: [{ firstName: { contains: name } }, { lastName: { contains: name } }] } : {},
          email ? { email: { contains: email } } : {},
          phone ? { phone: { contains: phone } } : {},
          customerId ? { customerId } : {},
          hasEmail === '1' ? { email: { not: null } } : {},
          hasPhone === '1' ? { phone: { not: null } } : {},
        ],
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ customer: { name: 'asc' } }, { firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const activeFilters: { label: string; removeUrl: string }[] = []

  function buildUrl(omit: string) {
    const params = new URLSearchParams()
    if (name && omit !== 'name') params.set('name', name)
    if (email && omit !== 'email') params.set('email', email)
    if (phone && omit !== 'phone') params.set('phone', phone)
    if (customerId && omit !== 'customerId') params.set('customerId', customerId)
    if (hasEmail === '1' && omit !== 'hasEmail') params.set('hasEmail', '1')
    if (hasPhone === '1' && omit !== 'hasPhone') params.set('hasPhone', '1')
    const qs = params.toString()
    return `/contacts${qs ? '?' + qs : ''}`
  }

  if (name) activeFilters.push({ label: `Namn: ${name}`, removeUrl: buildUrl('name') })
  if (email) activeFilters.push({ label: `E-post: ${email}`, removeUrl: buildUrl('email') })
  if (phone) activeFilters.push({ label: `Telefon: ${phone}`, removeUrl: buildUrl('phone') })
  if (customerId) {
    const co = companies.find((c) => c.id === customerId)
    activeFilters.push({ label: co?.name ?? 'Företag', removeUrl: buildUrl('customerId') })
  }
  if (hasEmail === '1') activeFilters.push({ label: 'Har e-post', removeUrl: buildUrl('hasEmail') })
  if (hasPhone === '1') activeFilters.push({ label: 'Har telefon', removeUrl: buildUrl('hasPhone') })

  const contactsByCompany: { customer: (typeof contacts)[0]['customer']; rows: typeof contacts }[] = []
  for (const c of contacts) {
    const last = contactsByCompany[contactsByCompany.length - 1]
    if (last && last.customer.id === c.customer.id) {
      last.rows.push(c)
    } else {
      contactsByCompany.push({ customer: c.customer, rows: [c] })
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-0.5">Kontakter</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} kontakter totalt</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContactsDeduplicateButton />
          <ContactsFilterSheet
            companies={companies}
            currentName={name}
            currentEmail={email}
            currentPhone={phone}
            currentCustomerId={customerId}
            currentHasEmail={hasEmail === '1'}
            currentHasPhone={hasPhone === '1'}
          />
        </div>
      </div>

      {/* Aktiva filter-pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Link
              key={f.label}
              href={f.removeUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {f.label}
              <span className="text-zinc-400 dark:text-zinc-500">×</span>
            </Link>
          ))}
          <Link
            href="/contacts"
            className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Rensa alla
          </Link>
        </div>
      )}

      <div className="panel-surface overflow-x-auto">
        {contacts.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Inga kontakter hittades</div>
        ) : (
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Namn</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Företag</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Titel</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">E-post</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Skapad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contactsByCompany.map(({ customer, rows }) => (
                <Fragment key={customer.id}>
                  <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 border-y border-zinc-200/80 dark:border-zinc-700">
                    <td colSpan={6} className="px-6 py-2.5">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      >
                        {customer.name}
                      </Link>
                    </td>
                  </tr>
                  {rows.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium text-gray-900 dark:text-zinc-100 hover:text-zinc-600 transition-colors"
                        >
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">
                        <Link
                          href={`/customers/${contact.customer.id}`}
                          className="hover:underline text-gray-700 dark:text-zinc-300"
                        >
                          {contact.customer.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{contact.title ?? '–'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{contact.email ?? '–'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">{contact.phone ?? '–'}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400">{formatDate(contact.createdAt)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
