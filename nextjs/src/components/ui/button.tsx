import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: "sm" | "md" | "lg" | "icon"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-brand-brown text-white hover:opacity-90 dark:bg-brand-brown dark:text-white dark:hover:opacity-90': variant === 'default',
            'border border-brand-brown/25 bg-white text-brand-brown hover:bg-brand-gray/60 dark:border-brand-beige/25 dark:bg-zinc-800 dark:text-brand-beige dark:hover:bg-zinc-700': variant === 'outline',
            'text-brand-foreground hover:bg-brand-gray/80 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-brand-beige': variant === 'ghost',
            'bg-red-700 text-white hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700': variant === 'destructive',
            'text-brand-brown underline-offset-4 hover:underline dark:text-brand-beige': variant === 'link',
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-11 px-5 text-sm": size === "lg",
            "h-9 w-9 shrink-0 p-0": size === "icon",
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
