'use client'

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { GlobalSearch } from './global-search'
import { NotificationCenter } from './notification-center'
import { UserAvatar } from './user-avatar'
import Link from 'next/link'

interface TopbarProps {
  onMenuClick: () => void
}


export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const ThemeIcon = mounted && theme === 'dark' ? Moon : Sun

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-brand-gray dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 lg:px-6">
      <div className="flex items-center gap-1">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors lg:hidden"
          aria-label="Öppna meny"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <GlobalSearch />

        <NotificationCenter />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          title={mounted && theme === 'dark' ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
          className="h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
        >
          <ThemeIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700 mx-1" />

        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{session?.user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500">{{ ADMIN: 'Admin', USER: 'Användare' }[session?.user?.role ?? ''] ?? session?.user?.role}</p>
        </div>
        <Link
          href="/profile"
          title="Min profil"
          className="rounded-full ring-1 ring-gray-200 dark:ring-zinc-600 hover:ring-zinc-400 dark:hover:ring-zinc-500 transition-[box-shadow] shrink-0"
        >
          {status === 'loading' ? (
            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-zinc-800" />
          ) : (
            <UserAvatar
              src={session?.user?.image}
              name={session?.user?.name}
              className="h-8 w-8"
            />
          )}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Logga ut"
          className="h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
