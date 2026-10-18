import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useRisikoWizardProgress,
  type ResolvedWizardStep,
} from '@/features/risiko/shared/risiko-wizard-store'

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  const { hasPermission } = usePermissions()
  const isRisikoWizardGroup = title === 'Pengelolaan Risiko'
  const { steps: wizardSteps, completedCount, totalSteps } =
    useRisikoWizardProgress(isRisikoWizardGroup)

  // Filter items and sub-items based on requiredPermission
  const visibleItems = items
    .map((item) => {
      if (item.items) {
        const permittedSubItems = item.items.filter((sub) => {
          if (!sub.requiredPermission) return true
          return hasPermission(sub.requiredPermission)
        })
        return {
          ...item,
          items: permittedSubItems,
        }
      }
      return item
    })
    .filter((item) => {
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
        return false
      }
      if (item.items && item.items.length === 0 && !item.url) {
        return false
      }
      return true
    })

  // Don't render the group at all if no items are visible
  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='flex items-center justify-between pr-1'>
        <span>{title}</span>
        {isRisikoWizardGroup && state !== 'collapsed' && (
          <Badge
            variant='outline'
            className='text-[9px] font-mono px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5'
          >
            Tahap {completedCount}/{totalSteps}
          </Badge>
        )}
      </SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item, idx) => {
          const key = `${item.title}-${item.url}`

          if (isRisikoWizardGroup && !item.items) {
            const matchedStep = wizardSteps.find((s) => s.url === item.url)
            return (
              <SidebarWizardMenuLink
                key={key}
                item={item}
                href={href}
                step={matchedStep}
                isLast={idx === visibleItems.length - 1}
              />
            )
          }

          if (!item.items)
            return <SidebarMenuLink key={key} item={item} href={href} />

          if (state === 'collapsed' && !isMobile)
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
            )

          return <SidebarMenuCollapsible key={key} item={item} href={href} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function SidebarWizardMenuLink({
  item,
  href,
  step,
  isLast,
}: {
  item: NavLink
  href: string
  step?: ResolvedWizardStep
  isLast: boolean
}) {
  const { setOpenMobile, state } = useSidebar()
  const isActive = checkIsActive(href, item)
  const isLocked = step ? !step.isUnlocked : false
  const isCompleted = step ? step.isCompleted : false
  const stepNum = step?.stepNumber ?? 1

  function handleLockedClick(e: React.MouseEvent) {
    e.preventDefault()
    toast.warning(
      `Langkah ${stepNum} (${item.title}) masih terkunci. Silakan lengkapi dan simpan langkah sebelumnya terlebih dahulu.`
    )
  }

  return (
    <SidebarMenuItem className='relative'>
      {/* Vertical Stepper Connector Line */}
      {!isLast && state !== 'collapsed' && (
        <span
          aria-hidden='true'
          className={cn(
            'pointer-events-none absolute left-[18px] top-7 -bottom-2 w-[1.5px] z-0 transition-colors',
            isCompleted ? 'bg-emerald-500/50' : 'bg-border'
          )}
        />
      )}

      {isLocked ? (
        <SidebarMenuButton
          isActive={false}
          tooltip={`${item.title} (Terkunci)`}
          onClick={handleLockedClick}
          className='opacity-60 cursor-not-allowed hover:bg-transparent'
        >
          <span className='relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-mono text-muted-foreground'>
            <Lock className='h-2.5 w-2.5' />
          </span>
          <span className='truncate whitespace-nowrap flex-1 text-muted-foreground'>
            {item.title}
          </span>
          <Badge
            variant='secondary'
            className='rounded-full px-1.5 py-0 text-[9px] h-4 text-muted-foreground font-normal'
          >
            Terkunci
          </Badge>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.title}
        >
          <Link to={item.url} onClick={() => setOpenMobile(false)}>
            <span
              className={cn(
                'relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold font-mono transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                  : isCompleted
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                  : 'bg-secondary text-secondary-foreground border border-border'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className='h-3 w-3' />
              ) : (
                stepNum
              )}
            </span>
            <span className='truncate whitespace-nowrap flex-1'>{item.title}</span>
            {isActive ? (
              <Badge className='rounded-full px-1.5 py-0 text-[9px] h-4'>
                Aktif
              </Badge>
            ) : isCompleted ? (
              <Badge
                variant='outline'
                className='rounded-full px-1.5 py-0 text-[9px] h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              >
                Selesai
              </Badge>
            ) : null}
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon className="shrink-0" />}
          <span className="truncate whitespace-nowrap flex-1">{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const { setOpenMobile } = useSidebar()
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon className="shrink-0" />}
            <span className="truncate whitespace-nowrap flex-1">{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    {subItem.icon && <subItem.icon className="shrink-0" />}
                    <span className="truncate whitespace-nowrap flex-1">{subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(href, item)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link
                to={sub.url}
                className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
              >
                {sub.icon && <sub.icon />}
                <span className='max-w-52 text-wrap'>{sub.title}</span>
                {sub.badge && (
                  <span className='ms-auto text-xs'>{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false): boolean {
  const [hrefPath, hrefQuery] = href.split('?')
  const [itemPath, itemQuery] = (item.url || '').split('?')

  if (itemQuery) {
    if (hrefQuery) {
      return href === item.url || hrefQuery === itemQuery
    }
    // Default to first tab (tab=tujuan) if on the base cascading path
    return hrefPath === itemPath && itemQuery === 'tab=tujuan'
  }

  return (
    href === item.url ||
    hrefPath === item.url ||
    !!item?.items?.some((i) => checkIsActive(href, i)) ||
    (mainNav &&
      hrefPath.split('/')[1] !== '' &&
      hrefPath.split('/')[1] === (item.url || '').split('/')[1])
  )
}
