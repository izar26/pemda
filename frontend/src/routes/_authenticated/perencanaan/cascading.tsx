import { createFileRoute, redirect } from '@tanstack/react-router'
import { CascadingManagement } from '@/features/perencanaan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/perencanaan/cascading')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('perencanaan.cascading') && !permissions.includes('perencanaan.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: CascadingManagement,
})
