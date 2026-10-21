import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanFeature } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    const hasAccess =
      isSuperadmin ||
      permissions.includes('konteks_risiko.view') ||
      permissions.includes('konteks_operasional.view') ||
      permissions.includes('tujuan.view')
    if (!hasAccess) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: LaporanFeature,
})

