import { createFileRoute, redirect } from '@tanstack/react-router'
import { AnalisisRisikoPage } from '@/features/risiko/analisis-risiko'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/risiko/analisis-risiko/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (!user?.roles?.includes('Superadmin') && user?.role !== 'Superadmin' && !user?.permissions?.some((permission) => ['identifikasi_risiko_opd.view', 'identifikasi_risiko_opd_operasional.view', 'review_risiko.view'].includes(permission))) {
      throw redirect({ to: '/errors/$error', params: { error: 'forbidden' } })
    }
  },
  component: AnalisisRisikoPage,
})
