'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'

interface CustomerOption {
  id: string
  name: string
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

function formatSEK(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(n)
}

export default function NyFakturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ])
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    fetch('/api/customers').then((r) => r.json()).then(setCustomers)
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

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
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
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.get('customerId'),
          title: formData.get('title'),
          issueDate: issueDate ? issueDate.toISOString().split('T')[0] : null,
          dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
          notes: formData.get('notes'),
          lineItems,
        }),
      })

      if (!res.ok) throw new Error()
      toast.success('Faktura skapad')
      router.push('/invoices')
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
          <Link href="/invoices" className="hover:text-gray-600 transition-colors">Fakturor</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Ny faktura</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Ny faktura</h1>
        <p className="text-sm text-gray-500 mt-1">Skapa en ny faktura</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Fakturauppgifter</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Kund <span className="text-red-500">*</span>
              </label>
              <Select name="customerId" required>
                <option value="">Välj kund...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Titel <span className="text-red-500">*</span>
              </label>
              <Input name="title" required placeholder="T.ex. Konsulttjänster mars 2026" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Utfärdad</label>
                <DatePicker value={issueDate} onChange={setIssueDate} placeholder="Välj datum" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Förfallodatum</label>
                <DatePicker value={dueDate} onChange={setDueDate} placeholder="Välj datum" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Anteckningar</label>
              <Textarea name="notes" placeholder="Betalningsvillkor, noter..." />
            </div>
          </div>
        </div>

        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Radartiklar</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-5">Beskrivning</div>
              <div className="col-span-2">Antal</div>
              <div className="col-span-2">Á-pris (ex. moms)</div>
              <div className="col-span-2">Summa</div>
              <div className="col-span-1" />
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Beskrivning..."
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-medium text-gray-900">{formatSEK(item.total)}</span>
                </div>
                <div className="col-span-1">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              + Lägg till rad
            </Button>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-gray-500">Delsumma</span>
                <span className="font-medium w-28 text-right">{formatSEK(subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-gray-500">Moms (25%)</span>
                <span className="font-medium w-28 text-right">{formatSEK(tax)}</span>
              </div>
              <div className="flex justify-end gap-8 text-sm border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-900">Totalt</span>
                <span className="font-bold text-gray-900 w-28 text-right">{formatSEK(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? 'Skapar…' : 'Skapa faktura'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/invoices')}>
            Avbryt
          </Button>
        </div>
      </form>
    </div>
  )
}
