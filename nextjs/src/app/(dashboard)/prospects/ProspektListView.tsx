'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { RadixSelect } from '@/components/ui/radix-select'

interface ProspectCompany {
  id: string
  name: string
  industry: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
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
        <RadixSelect
          value={selectedStageId}
          onChange={setSelectedStageId}
          options={[
            { value: 'all', label: 'Alla faser' },
            { value: 'ingen', label: 'Ingen fas' },
            ...stages.map(s => ({ value: s.id, label: s.name })),
          ]}
          className="max-w-xs"
        />
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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Webbplats</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Fas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Kontakter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/customers/${company.id}`} className="font-medium text-gray-900 hover:text-zinc-600 transition-colors">
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{company.industry ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600">{company.city ?? '–'}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-[14rem]">
                      {company.website ? (
                        <a
                          href={
                            company.website.startsWith('http://') || company.website.startsWith('https://')
                              ? company.website
                              : `https://${company.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-800 hover:underline break-all line-clamp-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {company.website}
                        </a>
                      ) : (
                        <span className="text-gray-400">Ingen webbplats</span>
                      )}
                    </td>
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
              <Link key={company.id} href={`/customers/${company.id}`} className="block">
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
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-xs">
                      {company.website ? (
                        <a
                          href={
                            company.website.startsWith('http://') || company.website.startsWith('https://')
                              ? company.website
                              : `https://${company.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-700 hover:underline truncate max-w-[12rem] inline-block"
                        >
                          {company.website}
                        </a>
                      ) : (
                        <span className="text-gray-400">Ingen webbplats</span>
                      )}
                    </span>
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
