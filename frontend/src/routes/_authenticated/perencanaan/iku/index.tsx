import { createFileRoute, redirect } from '@tanstack/react-router'
import { PerencanaanIku } from '@/features/perencanaan/iku'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/perencanaan/iku/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('iku.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: PerencanaanIku,
})
