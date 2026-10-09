import { createFileRoute, redirect } from '@tanstack/react-router'
import { KonteksStrategisForm } from '@/features/perencanaan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/perencanaan/konteks-strategis')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (
      !isSuperadmin &&
      !permissions.includes('risiko.konteks') &&
      !permissions.includes('perencanaan.renstra') &&
      !permissions.includes('perencanaan.view')
    ) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: KonteksStrategisForm,
})
