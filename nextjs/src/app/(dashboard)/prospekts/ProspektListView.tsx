'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface ProspectCompany {
  id: string
  name: string
  industry: string | null
  city: string | null
  phone: string | null
  email: string | null
  contacts: { id: string }[]
  prospectStage: { currentStageId: string; currentStage: { id: string; name: string; color: string | null } } | null
}

interface StageOption {
  id: string
  name: string
  color: string | null
}

interface Props {
  companies: ProspectCompany[]
  stages: StageOption[]
}

export default function ProspektListView({ companies, stages }: Props) {
  const [selectedStageId, setSelectedStageId] = useState<string>('all')

  const filtered =
    selectedStageId === 'all'
      ? companies
      : selectedStageId === 'ingen'
        ? companies.filter((c) => !c.prospectStage)
        : companies.filter((c) => c.prospectStage?.currentStageId === selectedStageId)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Filtrera fas:</label>
        <select
          value={selectedStageId}
          onChange={(e) => setSelectedStageId(e.target.value)}
          className="flex h-10 w-full max-w-xs rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-all outline-none hover:border-zinc-300 hover:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <option value="all">Alla faser</option>
          <option value="ingen">Ingen fas</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 shrink-0">{filtered.length} prospekts</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="panel-surface p-10 text-center text-sm text-gray-400">
          Inga prospekts matchar filtret
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="panel-surface hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Namn</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Bransch</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Stad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Fas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kontakter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/kunder/${company.id}`} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{company.industry ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{company.city ?? '–'}</td>
                    <td className="px-6 py-4">
                      {company.prospectStage?.currentStage ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: company.prospectStage.currentStage.color ?? '#94a3b8' }}
                          />
                          <span className="text-gray-700 text-xs">{company.prospectStage.currentStage.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Ingen fas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{company.contacts.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((company) => (
              <Link key={company.id} href={`/kunder/${company.id}`} className="block">
                <div className="panel-surface p-4 active:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{company.name}</h3>
                      {company.industry && (
                        <p className="text-xs text-gray-500 mt-0.5">{company.industry}</p>
                      )}
                    </div>
                    {company.prospectStage?.currentStage ? (
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: company.prospectStage.currentStage.color ?? '#94a3b8' }}
                        />
                        <span className="text-xs text-gray-600">{company.prospectStage.currentStage.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">Ingen fas</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {company.city && (
                      <span className="text-xs text-gray-500">{company.city}</span>
                    )}
                    {company.contacts.length > 0 && (
                      <Badge variant="gray">
                        {company.contacts.length} kontakt{company.contacts.length !== 1 ? 'er' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
