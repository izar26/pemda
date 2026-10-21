import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60 [&>svg]:text-red-600 dark:[&>svg]:text-red-400 *:data-[slot=alert-description]:text-red-800 dark:*:data-[slot=alert-description]:text-red-300',
        error:
          'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60 [&>svg]:text-red-600 dark:[&>svg]:text-red-400 *:data-[slot=alert-description]:text-red-800 dark:*:data-[slot=alert-description]:text-red-300',
        gagal:
          'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60 [&>svg]:text-red-600 dark:[&>svg]:text-red-400 *:data-[slot=alert-description]:text-red-800 dark:*:data-[slot=alert-description]:text-red-300',
        success:
          'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400 *:data-[slot=alert-description]:text-emerald-800 dark:*:data-[slot=alert-description]:text-emerald-300',
        berhasil:
          'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400 *:data-[slot=alert-description]:text-emerald-800 dark:*:data-[slot=alert-description]:text-emerald-300',
        warning:
          'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 *:data-[slot=alert-description]:text-amber-800 dark:*:data-[slot=alert-description]:text-amber-300',
        info:
          'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900/60 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400 *:data-[slot=alert-description]:text-sky-800 dark:*:data-[slot=alert-description]:text-sky-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot='alert'
      role='alert'
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-title'
      className={cn(
        'col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-description'
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
