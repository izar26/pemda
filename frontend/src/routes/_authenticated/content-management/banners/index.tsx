import { createFileRoute, redirect } from '@tanstack/react-router'
import { BannersManagement } from '@/features/content-management/banners'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/content-management/banners/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin = (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false
    if (!isSuperadmin && !permissions.includes('content.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: BannersManagement,
})
