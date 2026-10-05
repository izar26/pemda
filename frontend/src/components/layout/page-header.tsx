import { cn } from '@/lib/utils'

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  sticky?: boolean
}

export function PageHeader({
  children,
  className,
  sticky = true,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'transition-all',
        sticky &&
          'sticky top-16 z-20 -mx-4 -mt-6 mb-2 px-4 py-3.5 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-xs supports-[backdrop-filter]:bg-background/85',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
