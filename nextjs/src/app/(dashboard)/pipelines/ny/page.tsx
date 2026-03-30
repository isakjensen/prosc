'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

export default function NyPipelinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error()
      router.push('/pipelines')
    } catch {
      toast.error('Ett fel uppstod. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/pipelines" className="hover:text-gray-600 transition-colors">Pipelines</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Ny pipeline</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Ny pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">Skapa en ny prospekteringspipeline</p>
      </div>

      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Pipelineinformation</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel required>Namn</FieldLabel>
              <Input name="name" required placeholder="T.ex. Restauranger i Stockholm" />
            </div>

            <div>
              <FieldLabel required>Målkund / beskrivning</FieldLabel>
              <Textarea
                name="description"
                required
                placeholder="Beskriv vilken typ av företag du vill prospektera. T.ex. 'Restauranger och caféer i Stockholms innerstad med 5–50 anställda som saknar digital närvaro.'"
                rows={5}
              />
              <p className="text-xs text-gray-400 mt-1">
                Denna text används av AI för att generera söktermer och analysera träffar.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Skapar…' : 'Skapa pipeline'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/pipelines')}
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
