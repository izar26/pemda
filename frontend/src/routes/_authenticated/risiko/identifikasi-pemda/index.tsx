import { createFileRoute, redirect } from '@tanstack/react-router'
import { IdentifikasiPemdaPage } from '@/features/risiko/identifikasi-pemda'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/risiko/identifikasi-pemda/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (
      !isSuperadmin &&
      !permissions.includes('identifikasi_risiko_pemda.view') &&
      !permissions.includes('review_risiko.view') &&
      !permissions.includes('laporan.view')
    ) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: IdentifikasiPemdaPage,
})
