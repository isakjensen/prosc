'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { RadixSelect } from '@/components/ui/radix-select'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  discordId: string | null
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

export default function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const formData = Object.fromEntries(new FormData(form))

    const data: Record<string, string> = {
      name: formData.name as string,
      email: formData.email as string,
      role: formData.role as string,
      discordId: (formData.discordId as string) || "",
    }
    if (formData.password) {
      data.password = formData.password as string
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Kunde inte uppdatera')
        return
      }

      toast.success('Användare uppdaterad')
      router.refresh()
      onClose()
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redigera användare" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <FieldLabel>Namn</FieldLabel>
              <Input name="name" required defaultValue={user.name} />
            </div>
            <div>
              <FieldLabel>E-post</FieldLabel>
              <Input name="email" type="email" required defaultValue={user.email} />
            </div>
            <div>
              <FieldLabel>Roll</FieldLabel>
              <RadixSelect
                name="role"
                defaultValue={user.role}
                options={[
                  { value: 'USER', label: 'Användare' },
                  { value: 'ADMIN', label: 'Admin' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Discord ID</FieldLabel>
              <Input name="discordId" defaultValue={user.discordId ?? ""} placeholder="T.ex. 123456789012345678" />
            </div>
            <div>
              <FieldLabel>Nytt lösenord (valfritt)</FieldLabel>
              <PasswordInput name="password" placeholder="Lämna tomt för att behålla" />
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
