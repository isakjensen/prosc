'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface RadixSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RadixSelect({ value, onChange, options, placeholder = 'Välj…', disabled, className }: RadixSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm transition-all outline-none',
          'hover:border-zinc-300 hover:bg-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:bg-white',
          'data-[state=open]:border-zinc-500 data-[state=open]:ring-2 data-[state=open]:ring-zinc-500/20 data-[state=open]:bg-white',
          'data-[placeholder]:text-zinc-400',
          'text-zinc-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100',
          'dark:hover:border-zinc-600 dark:hover:bg-zinc-800',
          'dark:focus:border-zinc-400 dark:focus:bg-zinc-900',
          'dark:data-[state=open]:border-zinc-400 dark:data-[state=open]:bg-zinc-900',
          'dark:data-[placeholder]:text-zinc-500',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={16}
          className="z-[800] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:border-zinc-700 dark:bg-zinc-900"
        >
          <SelectPrimitive.Viewport className="p-1 max-h-64">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 outline-none cursor-pointer select-none data-[highlighted]:bg-zinc-50 data-[highlighted]:text-zinc-900 data-[state=checked]:font-medium data-[state=checked]:text-zinc-900 dark:text-zinc-300 dark:data-[highlighted]:bg-zinc-800 dark:data-[highlighted]:text-white dark:data-[state=checked]:text-white"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
