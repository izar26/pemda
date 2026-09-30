import { createFileRoute, redirect } from '@tanstack/react-router'
import { MasterData } from '@/features/master-data'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/master-data/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('master.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: MasterData,
})
