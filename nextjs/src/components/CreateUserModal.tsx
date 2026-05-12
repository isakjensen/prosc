'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { RadixSelect } from '@/components/ui/radix-select'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

export default function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Kunde inte skapa användare')
        return
      }

      toast.success('Användare skapad')
      router.refresh()
      onClose()
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ny användare" description="Skapa en ny användare i systemet" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <FieldLabel>Namn</FieldLabel>
              <Input name="name" required placeholder="Förnamn Efternamn" />
            </div>
            <div>
              <FieldLabel>E-post</FieldLabel>
              <Input name="email" type="email" required placeholder="namn@foretag.se" />
            </div>
            <div>
              <FieldLabel>Lösenord</FieldLabel>
              <PasswordInput name="password" required placeholder="Minst 6 tecken" />
            </div>
            <div>
              <FieldLabel>Discord ID</FieldLabel>
              <Input name="discordId" placeholder="T.ex. 123456789012345678" />
            </div>
            <div>
              <FieldLabel>Roll</FieldLabel>
              <RadixSelect
                name="role"
                defaultValue="USER"
                options={[
                  { value: "USER", label: "Användare" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Avbryt
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Skapar...' : 'Skapa användare'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
