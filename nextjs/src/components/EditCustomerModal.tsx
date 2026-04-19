'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ProspectStageOption {
  id: string
  name: string
  color?: string | null
}

interface CustomerData {
  id: string
  name: string
  stage?: string
  orgNumber?: string | null
  industry?: string | null
  website?: string | null
  /** Manuell Bolagsfakta-sida (används vid "Hämta/Uppdatera från Bolagsfakta") */
  bolagsfaktaSourceUrl?: string | null
  address?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  currentStageId?: string | null
  prospectStages?: ProspectStageOption[]
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
  const [selectedStageId, setSelectedStageId] = useState(customer.currentStageId ?? '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data: Record<string, unknown> = Object.fromEntries(new FormData(form))
    if (customer.stage === 'PROSPECT' && customer.prospectStages) {
      data.prospectStageId = selectedStageId
    }

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
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

            {customer.stage === 'PROSPECT' && customer.prospectStages && customer.prospectStages.length > 0 && (
              <div className="sm:col-span-2">
                <FieldLabel>Fas</FieldLabel>
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 transition-all outline-none hover:border-zinc-300 hover:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  <option value="">Ingen fas</option>
                  {customer.prospectStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

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

            <div className="sm:col-span-2">
              <FieldLabel>Bolagsfakta-URL</FieldLabel>
              <Input
                name="bolagsfaktaSourceUrl"
                defaultValue={customer.bolagsfaktaSourceUrl ?? ''}
                placeholder="https://www.bolagsfakta.se/…"
                type="text"
                inputMode="url"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-400">
                Spara länken till företagets sida på Bolagsfakta om du saknar organisationsnummer eller vill låsa till en viss URL.
              </p>
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
