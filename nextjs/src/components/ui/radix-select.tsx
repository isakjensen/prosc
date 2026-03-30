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
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all hover:bg-gray-50 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-gray-400',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[800] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none cursor-pointer select-none hover:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:font-medium data-[state=checked]:text-gray-900"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-zinc-700" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
