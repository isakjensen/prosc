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
          'border-brand-gray bg-brand-gray text-brand-foreground dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300': variant === 'default',
          'border-brand-green/40 bg-brand-green/15 text-brand-green dark:border-brand-green/50 dark:bg-brand-green/20 dark:text-brand-beige': variant === 'success',
          'border-brand-brown/25 bg-brand-beige text-brand-brown dark:border-brand-beige/35 dark:bg-brand-brown/30 dark:text-brand-beige': variant === 'warning',
          'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-400': variant === 'danger',
          'border-brand-green/30 bg-brand-beige/80 text-brand-green dark:border-brand-green/35 dark:bg-brand-brown/25 dark:text-brand-beige': variant === 'info',
          'border-brand-gray bg-brand-gray text-brand-foreground/80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400': variant === 'gray',
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
