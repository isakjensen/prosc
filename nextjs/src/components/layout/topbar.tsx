'use client'

import { signOut, useSession } from 'next-auth/react'
import { Menu, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors lg:hidden"
        aria-label="Öppna meny"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          title={`Tema: ${theme}`}
          className="h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
        >
          <ThemeIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700 mx-1" />

        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{session?.user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">{session?.user?.role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Logga ut"
          className="h-8 w-8 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white text-[11px] font-semibold flex items-center justify-center hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors shrink-0"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
