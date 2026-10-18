import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { PegawaiManagement } from '@/features/pegawai'
import { useAuthStore } from '@/stores/auth-store'

const pegawaiSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  jabatan: z
    .array(z.union([z.literal('Kepala OPD'), z.literal('Pegawai')]))
    .optional()
    .catch([]),
  opd: z.array(z.string()).optional().catch([]),
  name: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/pegawai/')({
  validateSearch: pegawaiSearchSchema,
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    const permissions = user?.permissions ?? []
    const isSuperadmin =
      (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ??
      false
    if (!isSuperadmin && !permissions.includes('pegawai.view')) {
      throw redirect({
        to: '/errors/$error',
        params: { error: 'forbidden' },
      })
    }
  },
  component: PegawaiManagement,
})
