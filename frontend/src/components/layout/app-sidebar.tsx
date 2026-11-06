import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { useAuthStore } from '@/stores/auth-store'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const authUser = useAuthStore((state) => state.auth.user)

  const isSuperadmin =
    authUser?.roles?.includes('Superadmin') || authUser?.role === 'Superadmin'
  const isAuditor =
    authUser?.roles?.includes('Auditor') || authUser?.role === 'Auditor'
  const isPengawas =
    authUser?.roles?.includes('Inspektorat') || authUser?.role === 'Inspektorat'
  const isKepalaOpd =
    authUser?.roles?.includes('Executive') || authUser?.role === 'Executive'

  const { data: pendingCounts } = useQuery({
    queryKey: ['risiko-pending-counts'],
    queryFn: () => pengajuanRisikoService.getPendingCounts(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: Boolean(authUser),
  })

  const currentUser = {
    name: authUser?.name || 'Administrator',
    email: authUser?.email || 'admin@pemda.go.id',
    avatar: '',
  }

  const navGroups = useMemo(() => {
    if (!pendingCounts) return sidebarData.navGroups

    return sidebarData.navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        // Review Risiko (Kepala OPD / Auditor / Pengawas)
        if (item.url === '/pengawasan/review-risiko') {
          let count = 0
          if (isSuperadmin) {
            count =
              (pendingCounts.auditor_pending || 0) +
              (pendingCounts.pengawas_pending || 0) +
              (pendingCounts.kepala_opd_pending || 0)
          } else if (isPengawas) {
            count = pendingCounts.pengawas_pending || 0
          } else if (isAuditor) {
            count = pendingCounts.auditor_pending || 0
          } else if (isKepalaOpd) {
            count = pendingCounts.kepala_opd_pending || 0
          }
          if (count > 0) {
            return { ...item, badge: count, badgeVariant: 'warning' as const }
          }
        }

        // Konteks Strategis (Operator action required / revisi)
        if (item.url === '/risiko/konteks-strategis') {
          if (pendingCounts.operator_action_required) {
            return {
              ...item,
              badge: 'Perlu Revisi',
              badgeVariant: 'destructive' as const,
            }
          }
        }

        return item
      }),
    }))
  }, [pendingCounts, isSuperadmin, isAuditor, isPengawas, isKepalaOpd])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
