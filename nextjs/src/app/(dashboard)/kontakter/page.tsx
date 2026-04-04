import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function KontakterPage({ searchParams }: PageProps) {
  const { q } = await searchParams

  const contacts = await prisma.contact.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {},
    include: { customer: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Kontakter</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} kontakter totalt</p>
        </div>
      </div>

      {/* Search */}
      <form method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Sök kontakt, e-post..."
          className="flex h-10 w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:bg-white transition-all"
        />
      </form>

      <div className="panel-surface">
          {contacts.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Inga kontakter hittades</div>
          ) : (
            <table className="w-full text-sm">
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
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/kontakter/${contact.id}`}
                        className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <Link
                        href={`/kunder/${contact.customerId}`}
                        className="hover:underline text-gray-700"
                      >
                        {contact.customer.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{contact.title ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.email ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.phone ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(contact.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
