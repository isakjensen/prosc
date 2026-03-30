import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 focus:bg-white focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)
Select.displayName = 'Select'

export { Select }
