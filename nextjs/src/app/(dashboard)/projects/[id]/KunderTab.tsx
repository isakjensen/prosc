'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  city: string | null
}

interface Props {
  projektId: string
  linkedCustomers: Customer[]
  allCustomers: Customer[]
  linkedCustomerIds: string[]
}

export default function KunderTab({ projektId, linkedCustomers, allCustomers, linkedCustomerIds }: Props) {
  const router = useRouter()
  const [linked, setLinked] = useState<Customer[]>(linkedCustomers)
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set(linkedCustomerIds))
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)

  const unlinkedCustomers = allCustomers.filter((c) => !linkedIds.has(c.id))

  const thClass = 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400'

  async function handleLink() {
    if (!selectedId) return
    setLoading(true)

    try {
      const res = await fetch(`/api/projects/${projektId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedId }),
      })

      if (!res.ok) throw new Error()
      const customer = allCustomers.find((c) => c.id === selectedId)
      if (customer) {
        setLinked((prev) => [...prev, customer])
        setLinkedIds((prev) => new Set([...prev, selectedId]))
      }
      setSelectedId('')
      router.refresh()
    } catch {
      toast.error('Kunde inte koppla kund. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlink(customerId: string) {
    try {
      const res = await fetch(`/api/projects/${projektId}/customers/${customerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error()
      setLinked((prev) => prev.filter((c) => c.id !== customerId))
      setLinkedIds((prev) => {
        const next = new Set(prev)
        next.delete(customerId)
        return next
      })
      router.refresh()
    } catch {
      toast.error('Kunde inte ta bort kund. Försök igen.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel-surface">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Kopplade kunder ({linked.length})</h2>
        </div>

        {linked.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">Inga kunder kopplade till projektet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className={thClass}>Kund</th>
                <th className={thClass}>Stad</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linked.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium text-gray-900 hover:text-zinc-600 transition-colors"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{customer.city ?? '–'}</td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnlink(customer.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Ta bort
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {unlinkedCustomers.length > 0 && (
        <div className="panel-surface">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Lägg till kund</h2>
          </div>
          <div className="p-6">
            <div className="flex gap-3">
              <Select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1"
              >
                <option value="">Välj kund…</option>
                {unlinkedCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.city ? ` – ${c.city}` : ''}
                  </option>
                ))}
              </Select>
              <Button onClick={handleLink} disabled={!selectedId || loading}>
                {loading ? 'Kopplar…' : 'Koppla kund'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
