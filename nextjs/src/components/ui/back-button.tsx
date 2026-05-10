import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BackButton({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors mb-5',
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {label}
    </Link>
  )
}
