'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChevronRight, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'

interface Company { id: string; name: string }
interface LineItem { description: string; quantity: number; unitPrice: number; total: number }

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}{required && <span className="ml-1 text-red-400 normal-case tracking-normal">*</span>}
    </label>
  )
}

function formatSEK(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n)
}

export default function NyOffertPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [validUntil, setValidUntil] = useState<Date | undefined>(undefined)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ])

  useEffect(() => {
    Promise.all([
      fetch('/api/kunder').then((r) => r.json()),
      fetch('/api/prospekts').then((r) => r.json()),
    ]).then(([customers, prospects]) => {
      setCompanies([...customers, ...prospects].sort((a: Company, b: Company) => a.name.localeCompare(b.name)))
    })
  }, [])

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        item.total = Number(item.quantity) * Number(item.unitPrice)
      }
      updated[index] = item
      return updated
    })
  }

  const subtotal = lineItems.reduce((s, item) => s + item.total, 0)
  const tax = subtotal * 0.25
  const total = subtotal + tax

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await fetch('/api/offerter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: formData.get('companyId'),
          title: formData.get('title'),
          validUntil: validUntil ? validUntil.toISOString() : null,
          notes: formData.get('notes'),
          lineItems,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Offert skapad!')
      router.push('/offerter')
    } catch {
      toast.error('Kunde inte skapa offerten. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/offerter" className="hover:text-gray-600 transition-colors">Offerter</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Ny offert</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Ny offert</h1>
        <p className="text-sm text-gray-500 mt-0.5">Skapa och skicka en offert till kund</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Offertuppgifter */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Offertuppgifter</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <FieldLabel required>Kund / Prospekt</FieldLabel>
              <Select name="companyId" required>
                <option value="">Välj företag…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel required>Titel</FieldLabel>
              <Input name="title" required placeholder="T.ex. Webbutveckling Q1 2026" />
            </div>
            <div>
              <FieldLabel>Giltig till</FieldLabel>
              <DatePicker value={validUntil} onChange={setValidUntil} placeholder="Välj giltighetsdatum" />
            </div>
            <div>
              <FieldLabel>Anteckningar</FieldLabel>
              <Textarea name="notes" placeholder="Villkor, betalningsvillkor, notes…" rows={3} />
            </div>
          </div>
        </div>

        {/* Radartiklar */}
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Radartiklar</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1">
              <div className="col-span-5">Beskrivning</div>
              <div className="col-span-2 text-right">Antal</div>
              <div className="col-span-3 text-right">Á-pris (ex. moms)</div>
              <div className="col-span-2 text-right">Summa</div>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Beskrivning…"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number" min="0" step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-medium text-gray-900">{formatSEK(item.total)}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== index))}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLineItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }])}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Lägg till rad
            </button>

            {/* Totals */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-gray-500">Delsumma</span>
                <span className="font-medium w-28 text-right">{formatSEK(subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-gray-500">Moms (25%)</span>
                <span className="font-medium w-28 text-right">{formatSEK(tax)}</span>
              </div>
              <div className="flex justify-end gap-8 text-sm border-t border-gray-100 pt-2">
                <span className="font-semibold text-gray-900">Totalt</span>
                <span className="font-bold text-gray-900 w-28 text-right">{formatSEK(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? 'Skapar…' : 'Skapa offert'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/offerter')}>
            Avbryt
          </Button>
        </div>
      </form>
    </div>
  )
}
