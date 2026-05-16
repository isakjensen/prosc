'use client'

import { useState } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import type { PipelineListItem } from './PipelineListClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedPipelines: PipelineListItem[]
  onScheduled: () => void
}

export default function PipelineScheduleModal({ isOpen, onClose, selectedPipelines, onScheduled }: Props) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  // Default to 10 minutes from now when modal opens (only set once on mount)
  function getDefaultDateTime() {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 10, 0, 0)
    // Format as "YYYY-MM-DDTHH:mm" for datetime-local input
    return d.toISOString().slice(0, 16)
  }

  function handleOpenChange() {
    if (!scheduledAt) {
      setScheduledAt(getDefaultDateTime())
    }
  }

  async function handleSubmit() {
    if (!scheduledAt) {
      toast.error('Välj datum och tid')
      return
    }

    const dt = new Date(scheduledAt)
    if (dt <= new Date()) {
      toast.error('Välj ett datum/tid i framtiden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/pipelines/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: dt.toISOString(),
          pipelineIds: selectedPipelines.map((p) => p.id),
        }),
      })

      const body = (await res.json().catch(() => ({}))) as { error?: string; count?: number }

      if (!res.ok) {
        toast.error(body.error ?? 'Kunde inte schemalägga')
        return
      }

      toast.success(
        `${body.count ?? selectedPipelines.length} pipeline(r) schemalagda att köra ${new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(dt)}`,
      )
      onScheduled()
      onClose()
      setScheduledAt('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Schemaläggning misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schemalägg pipelines"
      description={`${selectedPipelines.length} pipeline(r) körs sekventiellt vid valt datum och tid.`}
      size="sm"
    >
      <ModalBody>
        {/* Pipeline list */}
        <div className="space-y-1">
          {selectedPipelines.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
              <span className="tabular-nums text-xs text-gray-400 dark:text-zinc-500 w-4 shrink-0">{i + 1}.</span>
              <span className="truncate">{p.namn}</span>
            </div>
          ))}
        </div>

        {/* Date/time picker */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
            Starttid (sekventiell körning)
          </label>
          <input
            type="datetime-local"
            value={scheduledAt || getDefaultDateTime()}
            onChange={(e) => setScheduledAt(e.target.value)}
            onFocus={handleOpenChange}
            className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
          />
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
            Pipeline {selectedPipelines.length > 1 ? `${selectedPipelines.length} körs i tur och ordning` : 'körs'} från detta klockslag.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Avbryt
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Schemalägger…' : 'Schemalägg'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
