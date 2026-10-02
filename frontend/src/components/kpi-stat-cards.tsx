import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface KpiStatItem {
  title: string
  value: string | number
  icon: LucideIcon
  color?: string
  valueColor?: string
  sub?: string
}

interface KpiStatsCardsProps {
  items: KpiStatItem[]
  isLoading?: boolean
  className?: string
  count?: number
}

export function KpiStatsCards({
  items,
  isLoading,
  className,
  count = 4,
}: KpiStatsCardsProps) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-2.5 grid-cols-2 lg:grid-cols-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'
          >
            <div className='space-y-1.5'>
              <Skeleton className='h-3 w-20' />
              <Skeleton className='h-6 w-14' />
            </div>
            <Skeleton className='h-8 w-8 rounded-md shrink-0' />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-2.5 grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <div
            key={idx}
            className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs transition-colors hover:border-primary/30'
          >
            <div className='min-w-0 pr-2'>
              <span className='text-[11px] font-medium text-muted-foreground truncate block'>
                {item.title}
              </span>
              <div className='flex items-baseline gap-1.5 mt-0.5'>
                <p
                  className={cn(
                    'text-lg font-bold leading-tight',
                    item.valueColor || 'text-foreground'
                  )}
                >
                  {item.value}
                </p>
                {item.sub && (
                  <span className='text-[10px] text-muted-foreground truncate'>
                    {item.sub}
                  </span>
                )}
              </div>
            </div>
            <div
              className={cn(
                'rounded-md p-2 shrink-0',
                item.color || 'bg-primary/10 text-primary'
              )}
            >
              <Icon className='h-4 w-4' />
            </div>
          </div>
        )
      })}
    </div>
  )
}
