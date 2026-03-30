'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
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
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center px-5 border-b border-gray-200">
        <span className="text-[15px] font-bold text-gray-900 tracking-tight">
          Pro<span className="text-zinc-400">SC</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
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
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-gray-700' : 'text-gray-400')} />
                    {label}
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
