'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'

interface ProfilFormProps {
  user: {
    name: string
    email: string
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

export default function ProfilForm({ user }: ProfilFormProps) {
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
    }

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        toast.error('Ange nuvarande lösenord för att byta')
        setLoading(false)
        return
      }
      data.currentPassword = formData.currentPassword as string
      data.newPassword = formData.newPassword as string
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Kunde inte uppdatera profilen')
        return
      }

      toast.success('Profil uppdaterad')
      router.refresh()
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel-surface">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Redigera profil</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Uppdatera ditt namn, e-post eller lösenord</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Namn</FieldLabel>
              <Input name="name" required defaultValue={user.name} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>E-post</FieldLabel>
              <Input name="email" type="email" required defaultValue={user.email} />
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-zinc-800 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-3">Byt lösenord</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Nuvarande lösenord</FieldLabel>
                <PasswordInput name="currentPassword" placeholder="Krävs vid lösenordsbyte" />
              </div>
              <div>
                <FieldLabel>Nytt lösenord</FieldLabel>
                <PasswordInput name="newPassword" placeholder="Lämna tomt för att behålla" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-950/40">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
