import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuditLogs } from '@/features/audit-logs'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/audit-logs/')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin = (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false
    if (!isSuperadmin && !permissions.includes('audit.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: AuditLogs,
})
