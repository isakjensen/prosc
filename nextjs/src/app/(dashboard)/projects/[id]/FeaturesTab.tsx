'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

interface Subtask {
  id: string
  title: string
  completed: boolean
}

interface Feature {
  id: string
  name: string
  description: string
  status: string
  priority: string
  subtasks: Subtask[]
}

interface Props {
  projektId: string
  features: Feature[]
}

const featureStatusLabel: Record<string, string> = {
  PLANNING: 'Planering',
  IN_PROGRESS: 'Pågående',
  REVIEW: 'Granskning',
  DONE: 'Klar',
  CANCELLED: 'Avbruten',
}

const featureStatusVariant: Record<string, 'gray' | 'info' | 'warning' | 'success' | 'danger'> = {
  PLANNING: 'gray',
  IN_PROGRESS: 'info',
  REVIEW: 'warning',
  DONE: 'success',
  CANCELLED: 'danger',
}

const priorityLabel: Record<string, string> = {
  LOW: 'Låg',
  MEDIUM: 'Medium',
  HIGH: 'Hög',
  URGENT: 'Brådskande',
}

const priorityVariant: Record<string, 'gray' | 'default' | 'warning' | 'danger'> = {
  LOW: 'gray',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'danger',
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

export default function FeaturesTab({ projektId, features: initialFeatures }: Props) {
  const router = useRouter()
  const [features, setFeatures] = useState<Feature[]>(initialFeatures)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleToggleSubtask(featureId: string, subtaskId: string, completed: boolean) {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? {
              ...f,
              subtasks: f.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed } : s
              ),
            }
          : f
      )
    )

    try {
      await fetch(
        `/api/projects/${projektId}/features/${featureId}/subtasks/${subtaskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed }),
        }
      )
    } catch {
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === featureId
            ? {
                ...f,
                subtasks: f.subtasks.map((s) =>
                  s.id === subtaskId ? { ...s, completed: !completed } : s
                ),
              }
            : f
        )
      )
    }
  }

  async function handleAddFeature(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch(`/api/projects/${projektId}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error()
      const newFeature = await res.json()
      setFeatures((prev) => [...prev, { ...newFeature, subtasks: [] }])
      form.reset()
      setShowForm(false)
      router.refresh()
    } catch {
      toast.error('Kunde inte lägga till funktionen. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {features.length === 0 && !showForm ? (
        <div className="panel-surface p-10 text-center text-gray-400 text-sm">
          Inga funktioner ännu
        </div>
      ) : (
        features.map((feature) => (
          <div key={feature.id} className="panel-surface">
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{feature.name}</h3>
                {feature.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{feature.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Badge variant={featureStatusVariant[feature.status] ?? 'gray'}>
                  {featureStatusLabel[feature.status] ?? feature.status}
                </Badge>
                <Badge variant={priorityVariant[feature.priority] ?? 'gray'}>
                  {priorityLabel[feature.priority] ?? feature.priority}
                </Badge>
              </div>
            </div>
            {feature.subtasks.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Deluppgifter ({feature.subtasks.filter((s) => s.completed).length}/{feature.subtasks.length})
                </p>
                <div className="space-y-2">
                  {feature.subtasks.map((subtask) => (
                    <label
                      key={subtask.id}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={(e) =>
                          handleToggleSubtask(feature.id, subtask.id, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-zinc-600 focus:ring-zinc-500"
                      />
                      <span
                        className={`text-sm ${
                          subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {showForm ? (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Lägg till funktion</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddFeature} className="space-y-4">
              <div>
                <FieldLabel required>Namn</FieldLabel>
                <Input name="name" required placeholder="T.ex. Användarhantering" />
              </div>

              <div>
                <FieldLabel>Beskrivning</FieldLabel>
                <Textarea name="description" placeholder="Beskriv funktionen…" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select name="status" defaultValue="PLANNING">
                    <option value="PLANNING">Planering</option>
                    <option value="IN_PROGRESS">Pågående</option>
                    <option value="REVIEW">Granskning</option>
                    <option value="DONE">Klar</option>
                    <option value="CANCELLED">Avbruten</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Prioritet</FieldLabel>
                  <Select name="priority" defaultValue="MEDIUM">
                    <option value="LOW">Låg</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">Hög</option>
                    <option value="URGENT">Brådskande</option>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Sparar…' : 'Lägg till'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Avbryt
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          + Lägg till funktion
        </Button>
      )}
    </div>
  )
}
