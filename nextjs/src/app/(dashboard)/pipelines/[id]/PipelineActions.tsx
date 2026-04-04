'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  pipelineId: string
  status: string
}

export default function PipelineActions({ pipelineId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'scrape' | 'stop' | null>(null)
  const [error, setError] = useState('')

  async function handleScrape() {
    setLoading('scrape')
    setError('')
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/scrape`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte starta scraping.')
    } finally {
      setLoading(null)
    }
  }

  async function handleStop() {
    setLoading('stop')
    setError('')
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/stop`, { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setError('Kunde inte stoppa pipeline. Försök igen.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-2">
        <Button
          onClick={handleScrape}
          disabled={status === 'RUNNING' || loading !== null}
        >
          {loading === 'scrape' ? 'Startar...' : 'Starta scraping'}
        </Button>
        {status === 'RUNNING' && (
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={loading !== null}
          >
            {loading === 'stop' ? 'Stoppar...' : 'Stoppa'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
