'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface ProspectCompany {
  id: string
  name: string
  industry: string | null
  city: string | null
  contacts: { id: string }[]
  prospectStage: { currentStageId: string } | null
}

interface Column {
  id: string
  name: string
  color: string
  companies: ProspectCompany[]
}

export default function ProspektBoardView({ columns }: { columns: Column[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.id} className="flex-shrink-0 w-72">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: col.color }}
            />
            <span className="font-medium text-sm text-gray-700">{col.name}</span>
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {col.companies.length}
            </span>
          </div>

          <div className="space-y-3">
            {col.companies.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                Inga prospekts
              </div>
            ) : (
              col.companies.map((company) => (
                <div key={company.id} className="panel-surface p-4">
                  <Link href={`/kunder/${company.id}`}>
                    <h3 className="font-medium text-gray-900 hover:text-zinc-700 text-sm">
                      {company.name}
                    </h3>
                  </Link>
                  {company.industry && (
                    <p className="text-xs text-gray-400 mt-0.5">{company.industry}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
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
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
