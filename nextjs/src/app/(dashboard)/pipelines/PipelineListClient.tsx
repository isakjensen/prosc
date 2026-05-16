'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { cn, formatDateTime } from '@/lib/utils'
import { bolagsfaktaBranschListingUrl } from '@/lib/bolagsfakta-list-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Calendar, Play, CheckSquare, Square } from 'lucide-react'
import PipelineListDeleteButton from './PipelineListDeleteButton'
import PipelineScheduleModal from './PipelineScheduleModal'
import { toast } from '@/lib/toast'

const statusLabel: Record<string, string> = {
  IDLE: 'Ej startad',
  RUNNING: 'Skrapar…',
  COMPLETED: 'Klar',
  STOPPED: 'Stoppad',
}

const statusVariant: Record<string, 'gray' | 'info' | 'success' | 'danger'> = {
  IDLE: 'gray',
  RUNNING: 'info',
  COMPLETED: 'success',
  STOPPED: 'danger',
}

export type PipelineListItem = {
  id: string
  namn: string
  kommunNamn: string | null
  branschNamn: string | null
  kommunSlug: string | null
  branschSlug: string | null
  branschKod: string | null
  status: string
  lastScrapedAt: Date | null
  foretagCount: number
  detailOkCount: number
}

type LiveData = {
  id: string
  status: string
  foretagCount: number
  detailOkCount: number
  activeDetailCount: number
}

interface Props {
  initialPipelines: PipelineListItem[]
  visibleStatuses: string[]
}

export default function PipelineListClient({ initialPipelines, visibleStatuses }: Props) {
  const [liveData, setLiveData] = useState<Map<string, LiveData>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [runProgress, setRunProgress] = useState<{ current: number; total: number } | null>(null)
  const isRunningSequential = useRef(false)

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/pipelines/list-live', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as LiveData[]
      setLiveData(new Map(data.map((d) => [d.id, d])))
    } catch {
      // silently ignore — stale UI is acceptable
    }
  }, [])

  useEffect(() => {
    void fetchLive()
    const id = setInterval(fetchLive, 1500)
    return () => clearInterval(id)
  }, [fetchLive])

  const pipelines = initialPipelines.filter((p) => visibleStatuses.includes(p.status))

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function runSequential() {
    if (isRunningSequential.current) return
    const ids = [...selectedIds]
    if (ids.length === 0) return

    isRunningSequential.current = true
    setRunProgress({ current: 0, total: ids.length })
    clearSelection()

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      setRunProgress({ current: i, total: ids.length })

      try {
        const startRes = await fetch(`/api/pipelines/${id}/scrape`, { method: 'POST' })
        if (!startRes.ok) {
          const body = (await startRes.json().catch(() => ({}))) as { error?: string }
          toast.error(body.error ?? `Kunde inte starta pipeline ${i + 1}/${ids.length}`)
          continue
        }

        // Poll until no longer RUNNING before starting next
        await waitForIdle(id)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Fel vid körning av pipeline ${i + 1}`)
      }
    }

    setRunProgress({ current: ids.length, total: ids.length })
    setTimeout(() => {
      setRunProgress(null)
      isRunningSequential.current = false
    }, 2000)
  }

  async function waitForIdle(pipelineId: string, timeoutMs = 3_600_000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}/live`)
        if (!res.ok) break
        const data = (await res.json()) as { status: string }
        if (data.status !== 'RUNNING') break
      } catch {
        break
      }
    }
  }

  const selectedPipelines = initialPipelines.filter((p) => selectedIds.has(p.id))

  return (
    <>
      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            {selectedIds.size} vald{selectedIds.size !== 1 ? 'a' : ''}
          </span>
          {runProgress && (
            <span className="text-xs text-gray-500 dark:text-zinc-400 tabular-nums">
              {runProgress.current}/{runProgress.total} körda
            </span>
          )}
          <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700" />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setScheduleModalOpen(true)}
          >
            <Calendar className="h-3.5 w-3.5" />
            Schemalägg…
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={runSequential}
            disabled={isRunningSequential.current}
          >
            <Play className="h-3.5 w-3.5" />
            Kör nu (sekventiellt)
          </Button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors ml-1"
          >
            Avmarkera
          </button>
        </div>
      )}

      {/* Pipeline cards */}
      {pipelines.length === 0 ? (
        <div className="panel-surface flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Inga pipelines matchar det valda filtret.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pipelines.map((pipeline) => {
            const live = liveData.get(pipeline.id)
            const listCount = live?.foretagCount ?? pipeline.foretagCount
            const detailOk = live?.detailOkCount ?? pipeline.detailOkCount
            const currentStatus = live?.status ?? pipeline.status
            const isRunning = currentStatus === 'RUNNING'
            const detailPct = listCount > 0 ? Math.round((detailOk / listCount) * 100) : 0
            const isSelected = selectedIds.has(pipeline.id)

            const bolagsfaktaUrl = bolagsfaktaBranschListingUrl({
              kommunSlug: pipeline.kommunSlug,
              branschSlug: pipeline.branschSlug,
              branschKod: pipeline.branschKod,
            })

            return (
              <div
                key={pipeline.id}
                className={cn(
                  'panel-surface lift-card flex flex-col overflow-hidden relative',
                  isRunning && 'ring-1 ring-green-300/60 dark:ring-green-700/30',
                  isSelected && 'ring-2 ring-brand-brown dark:ring-brand-beige/60',
                )}
              >
                {/* Statuslinje i toppen */}
                <div
                  className={cn(
                    'h-[3px] w-full',
                    isRunning
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : currentStatus === 'COMPLETED'
                        ? 'bg-gradient-to-r from-brand-green to-brand-green/50'
                        : currentStatus === 'STOPPED'
                          ? 'bg-gradient-to-r from-red-400 to-red-300'
                          : 'bg-gray-200 dark:bg-zinc-700',
                  )}
                />

                {/* Select checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(pipeline.id)}
                  className="absolute top-3 left-3 z-10 text-gray-300 dark:text-zinc-600 hover:text-brand-brown dark:hover:text-brand-beige transition-colors"
                  aria-label={isSelected ? 'Avmarkera pipeline' : 'Markera pipeline'}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-brand-brown dark:text-brand-beige" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                <div className="p-5 pl-8 flex flex-col gap-4 flex-1">
                  {/* Header: namn + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/pipelines/${pipeline.id}`} className="group/name">
                        <h3 className="font-semibold text-gray-900 dark:text-zinc-100 group-hover/name:text-brand-brown transition-colors leading-snug line-clamp-2">
                          {pipeline.namn}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">
                        {pipeline.kommunNamn}
                        {pipeline.branschNamn && (
                          <> · <span className="line-clamp-1 inline">{pipeline.branschNamn}</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {isRunning && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                      )}
                      <Badge variant={statusVariant[currentStatus] ?? 'gray'}>
                        {statusLabel[currentStatus] ?? currentStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Statistik */}
                  {listCount > 0 ? (
                    <div className="flex items-end gap-4">
                      <div className="shrink-0">
                        <p className="text-[2rem] font-bold tabular-nums text-gray-900 dark:text-zinc-100 leading-none tracking-tight">
                          {listCount.toLocaleString('sv')}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 font-medium uppercase tracking-wide">
                          Företag
                        </p>
                      </div>
                      <div className="flex-1 min-w-0 pb-0.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Bolagsdata</span>
                          <span className="text-[11px] font-bold tabular-nums text-gray-700 dark:text-zinc-300">
                            {detailPct}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              detailPct === 100 ? 'bg-brand-green' : 'bg-brand-brown',
                            )}
                            style={{ width: `${detailPct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                          {detailOk.toLocaleString('sv')} av {listCount.toLocaleString('sv')} hämtade
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-3">
                      <p className="text-xs text-gray-400 dark:text-zinc-500 italic">Inga företag ännu — starta scraping</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800 mt-auto">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                        {pipeline.lastScrapedAt
                          ? formatDateTime(pipeline.lastScrapedAt)
                          : 'Ej körts'}
                      </span>
                      {bolagsfaktaUrl && (
                        <a
                          href={bolagsfaktaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-gray-300 dark:text-zinc-600 hover:text-brand-brown transition-colors"
                          title="Öppna på Bolagsfakta"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/pipelines/${pipeline.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-3">
                          Öppna
                        </Button>
                      </Link>
                      <PipelineListDeleteButton
                        pipelineId={pipeline.id}
                        pipelineNamn={pipeline.namn}
                        status={currentStatus}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PipelineScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        selectedPipelines={selectedPipelines}
        onScheduled={clearSelection}
      />
    </>
  )
}
