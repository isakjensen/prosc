'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (res?.error) {
      setError('Fel e-post eller lösenord')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="panel-surface overflow-hidden">
          {/* Brand header */}
          <div className="border-b border-brand-gray dark:border-zinc-800 px-6 py-5">
            <Image
              src="/bitrate-crm-logo-transparent.png"
              alt="Bitrate CRM"
              width={220}
              height={52}
              className="h-10 w-auto max-w-full object-contain object-left dark:brightness-110 dark:contrast-95"
              priority
            />
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500">Logga in för att fortsätta</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  E-post
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bcrm.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Lösenord
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Loggar in…' : 'Logga in'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
