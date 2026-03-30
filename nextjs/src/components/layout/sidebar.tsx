'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ClipboardList,
  Banknote,
  Box,
  CheckSquare,
  Calendar,
  LifeBuoy,
  Clock,
  BarChart3,
  Settings,
  Filter,
  ScrollText,
  UserCircle2,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Huvud',
    items: [
      { href: '/dashboard', label: 'Översikt', icon: LayoutDashboard },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/kunder', label: 'Kunder', icon: Building2 },
      { href: '/prospekts', label: 'Prospekts', icon: Filter },
      { href: '/kontakter', label: 'Kontakter', icon: UserCircle2 },
      { href: '/pipelines', label: 'Pipelines', icon: Users },
    ],
  },
  {
    label: 'Affär',
    items: [
      { href: '/offerter', label: 'Offerter', icon: FileText },
      { href: '/avtal', label: 'Avtal', icon: ClipboardList },
      { href: '/fakturor', label: 'Fakturor', icon: Banknote },
      { href: '/projekt', label: 'Projekt', icon: Box },
    ],
  },
  {
    label: 'Arbete',
    items: [
      { href: '/uppgifter', label: 'Uppgifter', icon: CheckSquare },
      { href: '/moten', label: 'Möten', icon: Calendar },
      { href: '/support', label: 'Support', icon: LifeBuoy },
      { href: '/tidrapportering', label: 'Tidrapportering', icon: Clock },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/rapporter', label: 'Rapporter', icon: BarChart3 },
      { href: '/systemloggar', label: 'Systemloggar', icon: ScrollText },
      { href: '/installningar', label: 'Inställningar', icon: Settings },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-gray-200 dark:border-zinc-800">
        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
          Pro<span className="text-zinc-400 dark:text-zinc-500">SC</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200',
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-md bg-gray-100 dark:bg-zinc-800"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                    <Icon className={cn('relative h-4 w-4 shrink-0', active ? 'text-gray-700 dark:text-zinc-300' : 'text-gray-400 dark:text-zinc-600')} />
                    <span className="relative">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
