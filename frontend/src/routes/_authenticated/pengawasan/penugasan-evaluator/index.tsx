import { createFileRoute, redirect } from '@tanstack/react-router'
import { PenugasanAuditorManagement as PenugasanEvaluatorManagement } from '@/features/pengawasan/penugasan-auditor'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/pengawasan/penugasan-evaluator/'
)({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    const hasAccess =
      isSuperadmin ||
      permissions.includes('penugasan_evaluator.view') ||
      permissions.includes('penugasan_auditor.view')
    if (!hasAccess) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: PenugasanEvaluatorManagement,
})
