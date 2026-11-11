import { createFileRoute, redirect } from '@tanstack/react-router'
import { IdentifikasiOpdPage } from '@/features/risiko/identifikasi-opd'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/risiko/identifikasi-opd/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (
      !isSuperadmin &&
      !permissions.includes('identifikasi_risiko_opd.view') &&
      !permissions.includes('review_risiko.view') &&
      !permissions.includes('laporan.view')
    ) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: IdentifikasiOpdPage,
})
