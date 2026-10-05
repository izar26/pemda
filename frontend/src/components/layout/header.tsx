import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed = true, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
    }

    // Add scroll listener to the window
    window.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-40 h-16 w-full',
        fixed && 'header-fixed peer/header sticky top-0 bg-background/95 backdrop-blur-md border-b border-border/60 shadow-xs supports-[backdrop-filter]:bg-background/85',
        offset > 10 && 'shadow-sm',
        className
      )}
      {...props}
    >
      <div className='relative flex h-full items-center gap-3 px-4 sm:gap-4'>
        <SidebarTrigger variant='outline' className='max-md:scale-125' />
        <Separator orientation='vertical' className='h-6' />
        {children}
      </div>
    </header>
  )
}
