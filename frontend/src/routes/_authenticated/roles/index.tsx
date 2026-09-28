import { createFileRoute, redirect } from '@tanstack/react-router'
import { Roles } from '@/features/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/roles/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin = (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false
    if (!isSuperadmin && !permissions.includes('roles.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: Roles,
})
