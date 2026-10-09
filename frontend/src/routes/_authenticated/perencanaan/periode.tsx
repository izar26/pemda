import { createFileRoute, redirect } from '@tanstack/react-router'
import { PeriodeManagement } from '@/features/perencanaan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/perencanaan/periode')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('perencanaan.periode') && !permissions.includes('perencanaan.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: PeriodeManagement,
})
