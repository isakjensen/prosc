'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export default function NyProjektPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/projekt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Kunde inte skapa projekt')
      toast.success('Projekt skapat')
      router.push('/projekt')
    } catch {
      toast.error('Ett fel uppstod. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Link href="/projekt" className="hover:text-gray-600 transition-colors">Projekt</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Nytt projekt</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Nytt projekt</h1>
        <p className="text-sm text-gray-500 mt-1">Fyll i uppgifterna nedan</p>
      </div>

      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Projektuppgifter</h2>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Namn <span className="text-red-500">*</span>
              </label>
              <Input name="name" required placeholder="T.ex. Fullstack Enterprise" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Beskrivning</label>
              <Textarea
                name="description"
                placeholder="Beskriv projektet..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Status</label>
              <Select name="status" defaultValue="ACTIVE">
                <option value="ACTIVE">Aktiv</option>
                <option value="PAUSED">Pausad</option>
                <option value="ARCHIVED">Arkiverad</option>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? 'Sparar…' : 'Skapa projekt'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/projekt')}
              >
                Avbryt
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
