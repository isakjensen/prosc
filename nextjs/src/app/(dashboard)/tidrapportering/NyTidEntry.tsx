'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

export default function NyTidEntry() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/tidrapportering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error()
      form.reset()
      toast.success('Tidpost sparad!')
      router.refresh()
    } catch {
      toast.error('Ett fel uppstod. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel-surface">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Ny tidpost</h2>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel required>Beskrivning</FieldLabel>
            <Textarea name="description" required placeholder="Vad arbetade du med?" className="min-h-[60px]" />
          </div>

          <div>
            <FieldLabel required>Timmar</FieldLabel>
            <Input name="hours" type="number" min="0.25" max="24" step="0.25" required placeholder="1.5" />
          </div>

          <div>
            <FieldLabel>Datum</FieldLabel>
            <Input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              name="billable"
              type="checkbox"
              id="billable"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-zinc-700"
            />
            <label htmlFor="billable" className="text-sm text-gray-700">Fakturerbar</label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sparar…' : 'Spara tidpost'}
          </Button>
        </form>
      </div>
    </div>
  )
}
