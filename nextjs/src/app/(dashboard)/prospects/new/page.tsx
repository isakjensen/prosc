'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function NyttProspektPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error()
      toast.success('Prospekt skapat')
      router.push('/prospects')
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
          <Link href="/prospects" className="hover:text-gray-600 transition-colors">Prospekts</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Ny prospekt</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Nytt prospekt</h1>
        <p className="text-sm text-gray-500 mt-1">Fyll i uppgifterna nedan</p>
      </div>

      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Prospektuppgifter</h2>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
                  Företagsnamn <span className="text-red-500">*</span>
                </label>
                <Input name="name" required placeholder="Exempelbolaget AB" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Organisationsnummer</label>
                <Input name="orgNumber" placeholder="XXXXXX-XXXX" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Bransch</label>
                <Input name="industry" placeholder="T.ex. IT, Bygg, Handel" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Webbplats</label>
                <Input name="website" placeholder="https://exempel.se" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Adress</label>
                <Input name="address" placeholder="Storgatan 1" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Stad</label>
                <Input name="city" placeholder="Stockholm" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Postnummer</label>
                <Input name="zip" placeholder="123 45" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Land</label>
                <Input name="country" defaultValue="Sverige" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Telefon</label>
                <Input name="phone" placeholder="08-123 456 78" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">E-post</label>
                <Input name="email" type="email" placeholder="info@exempel.se" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">Anteckningar</label>
                <Textarea name="notes" placeholder="Övrig information..." />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? 'Sparar…' : 'Skapa prospekt'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/prospects')}
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
