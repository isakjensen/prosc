'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/components/ThemeProvider'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1.5">
      {children}
    </label>
  )
}

const themes = [
  { value: 'light' as const, label: 'Ljust', icon: Sun },
  { value: 'dark' as const, label: 'Mörkt', icon: Moon },
]

export default function InstallningarForm({ settings }: Props) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/settings', {
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
    <div className="space-y-6">
      {/* Utseende */}
      <div className="panel-surface max-w-2xl mx-auto">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Utseende</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Sparas på ditt konto och följer dig på alla enheter
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2.5 rounded-lg border p-4 transition-all text-sm font-medium',
                  theme === value
                    ? 'border-zinc-800 bg-zinc-50 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-800 dark:text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Systeminställningar */}
      <div className="panel-surface max-w-2xl mx-auto">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Systeminställningar</h2>
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
    </div>
  )
}
