import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-zinc-800 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white': variant === 'default',
            'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-white': variant === 'outline',
            'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600': variant === 'destructive',
            'text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300': variant === 'link',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-11 px-5 text-sm': size === 'lg',
          },
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
