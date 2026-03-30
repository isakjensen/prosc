import { cn } from '@/lib/utils'

interface PageHeaderProps {
  kicker?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ kicker, title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('page-hero pb-5 flex items-start justify-between gap-4', className)}>
      <div>
        {kicker && <p className="page-kicker">{kicker}</p>}
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
