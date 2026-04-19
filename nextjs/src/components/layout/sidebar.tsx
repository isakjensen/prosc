'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  CalendarDays,
  LifeBuoy,
  BookOpen,
  BarChart3,
  Settings,
  Filter,
  ScrollText,
  Send,
  UserCircle2,
  UsersRound,
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
      { href: '/customers', label: 'Kunder', icon: Building2 },
      { href: '/prospects', label: 'Prospekts', icon: Filter },
      { href: '/outreach-planning', label: 'Outreach-plan', icon: Send },
      { href: '/contacts', label: 'Kontakter', icon: UserCircle2 },
      { href: '/pipelines', label: 'Pipeline', icon: Users },
    ],
  },
  {
    label: 'Affär',
    items: [
      { href: '/quotes', label: 'Offerter', icon: FileText },
      { href: '/contracts', label: 'Avtal', icon: ClipboardList },
      { href: '/invoices', label: 'Fakturor', icon: Banknote },
      { href: '/projects', label: 'Projekt', icon: Box },
    ],
  },
  {
    label: 'Arbete',
    items: [
      { href: '/tasks', label: 'Uppgifter', icon: CheckSquare },
      { href: '/meetings', label: 'Möten', icon: Calendar },
      { href: '/calendar', label: 'Kalender', icon: CalendarDays },
      { href: '/support', label: 'Support', icon: LifeBuoy },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/reports', label: 'Rapporter', icon: BarChart3 },
      { href: '/knowledge-base', label: 'Kunskapsbas', icon: BookOpen },
      { href: '/system-logs', label: 'Systemloggar', icon: ScrollText },
      { href: '/settings', label: 'Inställningar', icon: Settings },
      { href: '/users', label: 'Användare', icon: UsersRound },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 border-r border-brand-gray dark:border-zinc-800">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-brand-gray dark:border-zinc-800">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 min-w-0"
        >
          <Image
            src="/bitrate-crm-logo-transparent.png"
            alt="Bitrate CRM"
            width={168}
            height={40}
            className="h-8 w-auto max-w-[9.5rem] object-contain object-left shrink-0 dark:brightness-110 dark:contrast-95"
            priority
          />
        </Link>
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
                      "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-normal transition-colors",
                      active
                        ? "bg-brand-beige text-brand-brown dark:bg-brand-brown/35 dark:text-brand-beige font-medium"
                        : "text-gray-500 hover:bg-brand-gray/80 hover:text-brand-foreground dark:text-zinc-500 dark:hover:bg-zinc-800/60 dark:hover:text-brand-beige",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-md bg-brand-beige dark:bg-brand-brown/35"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                    <Icon className={cn('relative h-4 w-4 shrink-0', active ? 'text-brand-brown dark:text-brand-beige' : 'text-gray-400 dark:text-zinc-600')} />
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
