'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ContactData {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  title?: string | null
  role?: string | null
  notes?: string | null
}

interface EditContactModalProps {
  isOpen: boolean
  onClose: () => void
  contact: ContactData
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

export default function EditContactModal({ isOpen, onClose, contact }: EditContactModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Kunde inte uppdatera')
        return
      }

      toast.success('Kontakt uppdaterad')
      router.refresh()
      onClose()
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redigera kontakt" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Förnamn</FieldLabel>
              <Input name="firstName" required defaultValue={contact.firstName} />
            </div>

            <div>
              <FieldLabel>Efternamn</FieldLabel>
              <Input name="lastName" required defaultValue={contact.lastName} />
            </div>

            <div>
              <FieldLabel>Titel</FieldLabel>
              <Input name="title" defaultValue={contact.title ?? ''} placeholder="VD, Säljchef..." />
            </div>

            <div>
              <FieldLabel>Roll</FieldLabel>
              <Input name="role" defaultValue={contact.role ?? ''} placeholder="Styrelseledamot..." />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>E-post</FieldLabel>
              <Input name="email" type="email" defaultValue={contact.email ?? ''} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Telefon</FieldLabel>
              <Input name="phone" defaultValue={contact.phone ?? ''} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Anteckningar</FieldLabel>
              <Textarea name="notes" defaultValue={contact.notes ?? ''} rows={3} />
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
