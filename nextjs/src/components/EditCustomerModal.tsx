'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface CustomerData {
  id: string
  name: string
  orgNumber?: string | null
  industry?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

interface EditCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customer: CustomerData
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

export default function EditCustomerModal({ isOpen, onClose, customer }: EditCustomerModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch(`/api/kunder/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Kunde inte uppdatera')
        return
      }

      toast.success('Uppgifter uppdaterade')
      router.refresh()
      onClose()
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redigera företag" size="lg">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Företagsnamn</FieldLabel>
              <Input name="name" required defaultValue={customer.name} />
            </div>

            <div>
              <FieldLabel>Organisationsnummer</FieldLabel>
              <Input name="orgNumber" defaultValue={customer.orgNumber ?? ''} placeholder="XXXXXX-XXXX" />
            </div>

            <div>
              <FieldLabel>Bransch</FieldLabel>
              <Input name="industry" defaultValue={customer.industry ?? ''} />
            </div>

            <div>
              <FieldLabel>Webbplats</FieldLabel>
              <Input name="website" defaultValue={customer.website ?? ''} placeholder="https://" />
            </div>

            <div>
              <FieldLabel>Telefon</FieldLabel>
              <Input name="phone" defaultValue={customer.phone ?? ''} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>E-post</FieldLabel>
              <Input name="email" type="email" defaultValue={customer.email ?? ''} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Adress</FieldLabel>
              <Input name="address" defaultValue={customer.address ?? ''} />
            </div>

            <div>
              <FieldLabel>Stad</FieldLabel>
              <Input name="city" defaultValue={customer.city ?? ''} />
            </div>

            <div>
              <FieldLabel>Postnummer</FieldLabel>
              <Input name="zip" defaultValue={customer.zip ?? ''} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Land</FieldLabel>
              <Input name="country" defaultValue={customer.country ?? ''} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Anteckningar</FieldLabel>
              <Textarea name="notes" defaultValue={customer.notes ?? ''} rows={3} />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Avbryt
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Sparar...' : 'Spara'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
