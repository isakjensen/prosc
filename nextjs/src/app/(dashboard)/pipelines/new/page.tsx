'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { KOMMUNER } from '@/lib/kommuner'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

interface Bransch {
  id: string
  branschNamn: string
  branschSlug: string
  branschKod: string
  /** Antal företag i kommunen för branschen (Bolagsfakta) */
  foretagCount?: number | null
}

export default function NyPipelinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingBranscher, setLoadingBranscher] = useState(false)
  const [refetchingBranscher, setRefetchingBranscher] = useState(false)

  const [selectedKommunSlug, setSelectedKommunSlug] = useState('')
  const [selectedKommunNamn, setSelectedKommunNamn] = useState('')
  const [branscher, setBranscher] = useState<Bransch[]>([])
  const [selectedBransch, setSelectedBransch] = useState<Bransch | null>(null)
  const [namn, setNamn] = useState('')

  useEffect(() => {
    if (!selectedKommunSlug) {
      setBranscher([])
      setSelectedBransch(null)
      return
    }

    setLoadingBranscher(true)
    setBranscher([])
    setSelectedBransch(null)

    fetch(`/api/municipalities/${encodeURIComponent(selectedKommunSlug)}/industries`, {
      cache: 'no-store',
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBranscher(data)
        else toast.error('Kunde inte ladda branscher')
      })
      .catch(() => toast.error('Kunde inte ladda branscher'))
      .finally(() => setLoadingBranscher(false))
  }, [selectedKommunSlug])

  async function refetchBranscherForKommun() {
    if (!selectedKommunSlug) return
    setRefetchingBranscher(true)
    try {
      const r = await fetch(
        `/api/municipalities/${encodeURIComponent(selectedKommunSlug)}/industries?refresh=1`,
        { cache: 'no-store' },
      )
      const data = await r.json()
      if (Array.isArray(data)) {
        setBranscher(data)
        setSelectedBransch((prev) => {
          if (!prev) return null
          const next = data.find((b: Bransch) => b.branschKod === prev.branschKod)
          return next ?? null
        })
        toast.success(`Branscher hämtade på nytt (${data.length} st)`)
      } else {
        toast.error('Kunde inte uppdatera branscher')
      }
    } catch {
      toast.error('Kunde inte uppdatera branscher')
    } finally {
      setRefetchingBranscher(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBransch || !selectedKommunSlug) {
      toast.error('Välj kommun och bransch')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namn: namn || `${selectedBransch.branschNamn} – ${selectedKommunNamn}`,
          kommunSlug: selectedKommunSlug,
          kommunNamn: selectedKommunNamn,
          branschSlug: selectedBransch.branschSlug,
          branschNamn: selectedBransch.branschNamn,
          branschKod: selectedBransch.branschKod,
          bolagsfaktaForetagCount:
            selectedBransch.foretagCount != null ? selectedBransch.foretagCount : null,
        }),
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
          <Link href="/pipelines" className="hover:text-gray-600 transition-colors">Pipeline</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Ny pipeline</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Ny pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">Välj kommun och bransch att scrapea från Bolagsfakta</p>
      </div>

      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Pipelineinformation</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Välj kommun */}
            <div>
              <FieldLabel required>Kommun</FieldLabel>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                value={selectedKommunSlug}
                onChange={e => {
                  const slug = e.target.value
                  const k = KOMMUNER.find(k => k.slug === slug)
                  setSelectedKommunSlug(slug)
                  setSelectedKommunNamn(k?.namn ?? '')
                }}
                required
              >
                <option value="">Välj en kommun…</option>
                {KOMMUNER.map(k => (
                  <option key={k.slug} value={k.slug}>{k.namn}</option>
                ))}
              </select>
            </div>

            {/* Välj bransch */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <FieldLabel required>Bransch</FieldLabel>
                {selectedKommunSlug ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs h-8"
                    disabled={loadingBranscher || refetchingBranscher}
                    onClick={() => void refetchBranscherForKommun()}
                  >
                    {refetchingBranscher ? 'Hämtar om…' : 'Hämta om branscher'}
                  </Button>
                ) : null}
              </div>
              {loadingBranscher ? (
                <p className="text-sm text-gray-400">Laddar branscher…</p>
              ) : !selectedKommunSlug ? (
                <p className="text-sm text-gray-400">Välj en kommun först</p>
              ) : branscher.length === 0 ? (
                <p className="text-sm text-gray-400">Inga branscher hittades</p>
              ) : (
                <select
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={selectedBransch?.branschKod ?? ''}
                  onChange={e => {
                    const b = branscher.find(b => b.branschKod === e.target.value)
                    setSelectedBransch(b ?? null)
                  }}
                  required
                >
                  <option value="">Välj en bransch…</option>
                  {branscher.map(b => (
                    <option key={b.branschKod} value={b.branschKod}>
                      {b.branschKod} – {b.branschNamn}
                      {b.foretagCount != null ? ` (${b.foretagCount.toLocaleString('sv-SE')})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Valfritt namn */}
            <div>
              <FieldLabel>Namn (valfritt)</FieldLabel>
              <Input
                value={namn}
                onChange={e => setNamn(e.target.value)}
                placeholder={
                  selectedBransch && selectedKommunNamn
                    ? `${selectedBransch.branschNamn} – ${selectedKommunNamn}`
                    : 'Lämna tomt för automatiskt namn'
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !selectedBransch}>
                {loading ? 'Skapar…' : 'Skapa pipeline'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/pipelines')}>
                Avbryt
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
