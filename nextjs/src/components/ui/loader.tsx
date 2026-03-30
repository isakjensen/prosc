import { cn } from '@/lib/utils'

interface LoaderProps {
  text?: string
  className?: string
}

export function Loader({ text = 'Laddar…', className }: LoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <div className="h-7 w-7 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}
