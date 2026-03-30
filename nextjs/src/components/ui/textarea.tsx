import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
          'hover:border-zinc-300 hover:bg-white focus:bg-white focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all resize-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500',
          'dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900 dark:focus:border-zinc-400',
          className,
        )}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
