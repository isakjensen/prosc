'use client'

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <div className="flex h-10 w-full items-center rounded-md border border-gray-200 bg-gray-50/50 hover:bg-gray-50 focus-within:bg-white focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-500/20 transition-all">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(
            'h-full flex-1 rounded-md bg-transparent px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="flex h-full items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
