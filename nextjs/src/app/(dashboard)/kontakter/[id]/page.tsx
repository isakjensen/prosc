import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function KontaktDetailPage({ params }: PageProps) {
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      activities: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!contact) notFound()

  const companyHref =
    contact.company.type === 'CUSTOMER'
      ? `/kunder/${contact.companyId}`
      : `/prospekts/${contact.companyId}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/kontakter" className="hover:text-gray-600 transition-colors">Kontakter</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">{contact.firstName} {contact.lastName}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {contact.firstName} {contact.lastName}
        </h1>
        {contact.title && <p className="text-sm text-gray-500 mt-0.5">{contact.title}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Kontaktuppgifter</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              {
                label: 'Företag',
                value: (
                  <Link href={companyHref} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                    {contact.company.name}
                  </Link>
                ),
              },
              { label: 'Titel', value: contact.title ?? '–' },
              { label: 'E-post', value: contact.email ?? '–' },
              { label: 'Telefon', value: contact.phone ?? '–' },
              { label: 'Skapad', value: formatDate(contact.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {contact.notes && (
          <div className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Anteckningar</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </div>
        )}
      </div>

      {contact.activities.length > 0 && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Aktivitet</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {contact.activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-zinc-700">
                      {a.user?.name?.charAt(0) ?? 'S'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{a.user?.name ?? 'System'}</span>{' '}
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
