'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const methods = [
  { value: 'BANK_TRANSFER', label: 'Bankgiro' },
  { value: 'CREDIT_CARD', label: 'Kort' },
  { value: 'CASH', label: 'Kontant' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'OTHER', label: 'Annat' },
]

export default function PaymentForm({ invoiceId, remaining }: { invoiceId: string; remaining: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [reference, setReference] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), method, reference: reference || null }),
      })
      if (res.ok) {
        setOpen(false)
        setAmount(remaining.toFixed(2))
        setReference('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="px-6 py-4">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Registrera betalning
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">Registrera betalning</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Belopp (kr)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Metod</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Referens</label>
          <Input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="OCR/referensnr"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Sparar...' : 'Spara betalning'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}
