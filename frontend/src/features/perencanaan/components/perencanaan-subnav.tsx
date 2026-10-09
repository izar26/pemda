import { Link, useLocation } from '@tanstack/react-router'
import { Calendar, GitFork, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PerencanaanSubnav() {
  const location = useLocation()
  const pathname = location.pathname

  const navItems = [
    {
      title: 'Periode Penilaian',
      badge: 'Fitur 13',
      href: '/perencanaan/periode',
      icon: Calendar,
    },
    {
      title: 'Cascading Makro Bapperida',
      badge: 'Fitur 14–17',
      href: '/perencanaan/cascading',
      icon: GitFork,
    },
    {
      title: 'Renstra SKPD (Program & Kegiatan)',
      badge: 'Sheet 2B & 2C',
      href: '/perencanaan/renstra',
      icon: Layers,
    },
  ]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/60 mb-5">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {item.badge}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
