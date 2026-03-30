'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

export default function NyKundPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/kunder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success('Kund skapad!')
      router.push('/kunder')
    } catch {
      toast.error('Kunde inte skapa kunden. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/kunder" className="hover:text-gray-600 transition-colors">Kunder</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Ny kund</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Ny kund</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fyll i företagsinformationen nedan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Grunduppgifter */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Företagsinformation</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldLabel required>Företagsnamn</FieldLabel>
                <Input name="name" required placeholder="Exempelbolaget AB" />
              </div>
              <div>
                <FieldLabel>Bransch</FieldLabel>
                <Input name="industry" placeholder="T.ex. IT, Bygg, Handel" />
              </div>
              <div>
                <FieldLabel>Webbplats</FieldLabel>
                <Input name="website" placeholder="https://exempel.se" />
              </div>
              <div>
                <FieldLabel>Telefon</FieldLabel>
                <Input name="phone" placeholder="08-123 456 78" />
              </div>
              <div>
                <FieldLabel>E-post</FieldLabel>
                <Input name="email" type="email" placeholder="info@exempel.se" />
              </div>
            </div>
          </div>
        </div>

        {/* Adress */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Adress</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldLabel>Gatuadress</FieldLabel>
                <Input name="address" placeholder="Storgatan 1" />
              </div>
              <div>
                <FieldLabel>Stad</FieldLabel>
                <Input name="city" placeholder="Stockholm" />
              </div>
              <div>
                <FieldLabel>Postnummer</FieldLabel>
                <Input name="zip" placeholder="123 45" />
              </div>
              <div className="col-span-2">
                <FieldLabel>Land</FieldLabel>
                <Input name="country" defaultValue="Sverige" />
              </div>
            </div>
          </div>
        </div>

        {/* Anteckningar */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Anteckningar</h2>
          </div>
          <div className="p-6">
            <Textarea name="notes" placeholder="Övrig information om kunden…" rows={4} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? 'Sparar…' : 'Skapa kund'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/kunder')}>
            Avbryt
          </Button>
        </div>
      </form>
    </div>
  )
}
