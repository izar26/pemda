import { createFileRoute, redirect } from '@tanstack/react-router'
import { PerencanaanSasaran } from '@/features/perencanaan/sasaran'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/perencanaan/sasaran/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('sasaran.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: PerencanaanSasaran,
})
