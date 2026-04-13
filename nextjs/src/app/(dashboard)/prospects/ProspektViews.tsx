'use client'

import { useState } from 'react'
import ProspektViewToggle from './ProspektViewToggle'
import ProspektBoardView from './ProspektBoardView'
import ProspektListView from './ProspektListView'

interface ProspectCompany {
  id: string
  name: string
  industry: string | null
  city: string | null
  phone: string | null
  email: string | null
  contacts: { id: string }[]
  prospectStage: {
    currentStageId: string
    currentStage: { id: string; name: string; color: string | null }
  } | null
}

interface Stage {
  id: string
  name: string
  color: string | null
}

interface Column {
  id: string
  name: string
  color: string
  companies: ProspectCompany[]
}

interface Props {
  columns: Column[]
  companies: ProspectCompany[]
  stages: Stage[]
}

export default function ProspektViews({ columns, companies, stages }: Props) {
  const [view, setView] = useState<'board' | 'list'>('board')

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ProspektViewToggle view={view} onChange={setView} />
      </div>

      {view === 'board' ? (
        <ProspektBoardView columns={columns} />
      ) : (
        <ProspektListView companies={companies} stages={stages} />
      )}
    </div>
  )
}
