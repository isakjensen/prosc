'use client'

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <div className="flex h-10 w-full items-center rounded-md border border-gray-200 bg-gray-50/50 hover:bg-gray-50 focus-within:bg-white focus-within:border-brand-brown focus-within:ring-2 focus-within:ring-brand-brown/20 transition-all dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 dark:focus-within:bg-zinc-900 dark:focus-within:border-brand-beige dark:focus-within:ring-brand-beige/25">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(
            'h-full flex-1 rounded-md bg-transparent px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="flex h-full items-center px-3 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
