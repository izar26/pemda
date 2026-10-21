import { createFileRoute, redirect } from '@tanstack/react-router'
import { PenugasanAuditorManagement } from '@/features/pengawasan/penugasan-auditor'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/pengawasan/penugasan-auditor/'
)({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('penugasan_auditor.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: PenugasanAuditorManagement,
})
