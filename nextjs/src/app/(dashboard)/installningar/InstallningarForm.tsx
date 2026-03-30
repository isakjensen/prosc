'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Setting {
  key: string
  label: string
  placeholder: string
  value: string
}

interface Props {
  settings: Setting[]
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
      {children}
    </label>
  )
}

export default function InstallningarForm({ settings }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/installningar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: Object.entries(values).map(([key, value]) => ({ key, value })),
        }),
      })

      if (!res.ok) throw new Error()
      toast.success('Inställningar sparade!')
      router.refresh()
    } catch {
      toast.error('Kunde inte spara inställningar. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel-surface max-w-2xl">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Systeminställningar</h2>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {settings.map((setting) => (
            <div key={setting.key}>
              <FieldLabel>{setting.label}</FieldLabel>
              <Input
                value={values[setting.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                placeholder={setting.placeholder}
              />
            </div>
          ))}

          <div className="pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Sparar…' : 'Spara inställningar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
