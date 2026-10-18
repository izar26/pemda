import * as React from 'react'
import { ChevronsUpDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAppConfig } from '@/hooks/use-app-config'

type TeamSwitcherProps = {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])
  const { appName, instanceName, appLogoUrl } = useAppConfig()

  // Use dynamic app name and instance name if using the default team
  const displayName = activeTeam.name === 'Aplikasi ManRis' ? appName : activeTeam.name
  const displayPlan = activeTeam.plan === 'Manajemen Risiko PEMDA' ? instanceName : activeTeam.plan

  if (teams.length <= 1) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            className='hover:bg-transparent active:bg-transparent cursor-default'
          >
            {appLogoUrl ? (
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-background border border-border/60 p-1 shadow-2xs overflow-hidden'>
                <img
                  src={appLogoUrl}
                  alt={displayName}
                  className='h-full w-full object-contain'
                />
              </div>
            ) : (
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs'>
                <activeTeam.logo className='size-4' />
              </div>
            )}
            <div className='grid flex-1 text-start text-sm leading-tight'>
              <span className='truncate font-bold tracking-tight text-sidebar-foreground'>
                {displayName}
              </span>
              <span className='truncate text-[11px] text-sidebar-foreground/70'>
                {displayPlan}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              {appLogoUrl ? (
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-background border border-border/60 p-1 shadow-2xs overflow-hidden'>
                  <img
                    src={appLogoUrl}
                    alt={displayName}
                    className='h-full w-full object-contain'
                  />
                </div>
              ) : (
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs'>
                  <activeTeam.logo className='size-4' />
                </div>
              )}
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-bold tracking-tight'>
                  {displayName}
                </span>
                <span className='truncate text-[11px] text-sidebar-foreground/70'>{displayPlan}</span>
              </div>
              <ChevronsUpDown className='ms-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Instansi
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <team.logo className='size-4 shrink-0' />
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className='gap-2 p-2'>
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>Tambah Instansi</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
