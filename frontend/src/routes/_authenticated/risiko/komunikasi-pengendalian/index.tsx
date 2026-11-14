import { createFileRoute, redirect } from '@tanstack/react-router'
import { KomunikasiPengendalianPage } from '@/features/risiko/komunikasi-pengendalian'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/risiko/komunikasi-pengendalian/'
)({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (
      !user?.roles?.includes('Superadmin') &&
      user?.role !== 'Superadmin' &&
      !user?.permissions?.some((permission) =>
        [
          'identifikasi_risiko_opd.view',
          'identifikasi_risiko_opd_operasional.view',
          'review_risiko.view',
          'laporan.view',
        ].includes(permission)
      )
    ) {
      throw redirect({ to: '/errors/$error', params: { error: 'forbidden' } })
    }
  },
  component: () => <KomunikasiPengendalianPage />,
})
