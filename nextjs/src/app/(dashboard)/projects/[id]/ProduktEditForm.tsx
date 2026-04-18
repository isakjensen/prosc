'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useConfirm } from '@/components/confirm/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

interface Props {
  project: {
    id: string
    name: string
    description: string
    status: string
  }
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

export default function ProjektEditForm({ project }: Props) {
  const confirm = useConfirm()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error()
      toast.success('Projektet har uppdaterats.')
      router.refresh()
    } catch {
      toast.error('Ett fel uppstod. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Ta bort projekt?',
      description: 'Är du säker på att du vill ta bort projektet? Detta går inte att ångra.',
      variant: 'danger',
      confirmLabel: 'Ta bort',
      cancelLabel: 'Avbryt',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.push('/projects')
    } catch {
      toast.error('Kunde inte ta bort projektet.')
    }
  }

  return (
    <div className="panel-surface">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Redigera projekt</h2>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel required>Namn</FieldLabel>
            <Input name="name" required defaultValue={project.name} />
          </div>

          <div>
            <FieldLabel>Beskrivning</FieldLabel>
            <Textarea name="description" defaultValue={project.description} rows={4} />
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <Select name="status" defaultValue={project.status}>
              <option value="ACTIVE">Aktiv</option>
              <option value="PAUSED">Pausad</option>
              <option value="ARCHIVED">Arkiverad</option>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Sparar…' : 'Spara ändringar'}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Ta bort
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
