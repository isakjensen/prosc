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
          'border-zinc-200 bg-zinc-100 text-zinc-700': variant === 'default',
          'border-[#86efac] bg-[#dcfce7] text-[#047857]': variant === 'success',
          'border-[#fde68a] bg-[#fef9c3] text-[#a16207]': variant === 'warning',
          'border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]': variant === 'danger',
          'border-[#93c5fd] bg-[#dbeafe] text-[#1d4ed8]': variant === 'info',
          'border-gray-200 bg-gray-100 text-gray-600': variant === 'gray',
        },
        className,
      )}
    >
      {children}
    </span>
  )
}
