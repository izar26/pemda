import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { NavbarStatus } from './navbar-status'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed = true, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(() =>
    typeof window !== 'undefined'
      ? window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
      : 0
  )

  useEffect(() => {
    const onScroll = () => {
      setOffset(window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
    }

    // Add scroll listener to the window
    window.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isScrolled = fixed && offset > 0

  return (
    <header
      className={cn(
        'z-40 h-16 w-full dark bg-neutral-950 text-neutral-100 border-b border-neutral-800 shadow-xs',
        !isScrolled
          ? 'group-has-data-[variant=inset]/sidebar-wrapper:md:rounded-t-xl'
          : 'rounded-t-none',
        fixed && 'header-fixed peer/header sticky top-0 backdrop-blur-md supports-[backdrop-filter]:bg-neutral-950/90',
        offset > 10 && 'shadow-sm',
        className
      )}
      {...props}
    >
      <div className='relative flex h-full items-center gap-2.5 px-3 sm:px-4 sm:gap-3'>
        <SidebarTrigger variant='outline' className='max-md:scale-125' />
        <Separator orientation='vertical' className='h-6' />
        {children ?? (
          <>
            <Search className='me-auto' />
            <NavbarStatus />
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </>
        )}
      </div>
    </header>
  )
}
