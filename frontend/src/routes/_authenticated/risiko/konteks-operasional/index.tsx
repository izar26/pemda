import { createFileRoute, redirect } from '@tanstack/react-router'
import { KonteksOperasionalFeature } from '@/features/risiko/konteks-operasional'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/risiko/konteks-operasional/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('konteks_operasional.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: KonteksOperasionalFeature,
})
