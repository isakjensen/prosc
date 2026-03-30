'use client'

import { signOut, useSession } from 'next-auth/react'
import { Bars3Icon } from '@heroicons/react/24/outline'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden"
        aria-label="Öppna meny"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3 ml-auto">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 leading-tight">{session?.user?.name}</p>
          <p className="text-xs text-gray-500">{session?.user?.role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Logga ut"
          className="h-8 w-8 rounded-full bg-zinc-800 text-white text-[11px] font-semibold flex items-center justify-center hover:bg-zinc-700 transition-colors shrink-0"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
