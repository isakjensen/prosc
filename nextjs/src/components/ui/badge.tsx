import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        {
          'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300': variant === 'default',
          'border-[#86efac] bg-[#dcfce7] text-[#047857] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400': variant === 'success',
          'border-[#fde68a] bg-[#fef9c3] text-[#a16207] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400': variant === 'warning',
          'border-[#fca5a5] bg-[#fee2e2] text-[#991b1b] dark:border-red-800 dark:bg-red-950 dark:text-red-400': variant === 'danger',
          'border-[#93c5fd] bg-[#dbeafe] text-[#1d4ed8] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400': variant === 'info',
          'border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400': variant === 'gray',
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
